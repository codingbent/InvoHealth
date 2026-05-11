const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Appointment = require("../../../models/Appointment");
const Country = require("../../../models/Country"); // ← add this import
const fetchuser = require("../../../middleware/fetchuser");
const requireSubscription = require("../../../middleware/requiresubscription");

// Maximum number of service names allowed in a single filter request.
const MAX_SERVICE_FILTER_ENTRIES = 50;

// Maximum character length for a single service name in the filter.
const MAX_SERVICE_NAME_LENGTH = 200;

router.get(
    "/fetchall_appointments",
    fetchuser,
    requireSubscription,
    async (req, res) => {
        try {
            const {
                limit = 20,
                skip = 0,
                search = "",
                gender,
                payments,
                status,
                services,
                startDate,
                endDate,
                type,
            } = req.query;

            const VALID_STATUS = ["Unpaid", "Paid", "Partial"];
            const VALID_GENDER = ["male", "female"];
            const VALID_TYPE = ["upcoming", "history"];

            const escapeRegex = (s = "") =>
                s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            if (type && !VALID_TYPE.includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid type. Must be 'upcoming' or 'history'.",
                });
            }

            const parsedLimit = Math.min(parseInt(limit) || 20, 100);
            const parsedSkip = parseInt(skip) || 0;

            const safeSearch = search?.trim() ? escapeRegex(search.trim()) : "";

            const doctorId =
                req.user.role === "doctor" ? req.user.id : req.user.doctorId;

            // ── Resolve clinic timezone via Doctor → address.countryId → Country ──
            const doctorDoc = await mongoose
                .model("Doc")
                .findById(doctorId)
                .select("address.countryId")
                .lean();

            let clinicTimezone = "Asia/Kolkata"; // safe fallback
            if (doctorDoc?.address?.countryId) {
                const countryDoc = await Country.findById(
                    doctorDoc.address.countryId,
                )
                    .select("timezone")
                    .lean();
                if (countryDoc?.timezone) {
                    clinicTimezone = countryDoc.timezone;
                }
            }

            const matchStage = {
                doctor: new mongoose.Types.ObjectId(doctorId),
            };

            // visitMatch is built as an $and array so $or and field filters
            // can coexist without overwriting each other
            const visitAndClauses = [];

            const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

            // ── Tab boundary filter (time-aware) ─────────────────────────
            if (type === "upcoming" || type === "history") {
                const now = new Date();

                const todayStr = now.toLocaleDateString("en-CA", {
                    timeZone: clinicTimezone,
                }); // "YYYY-MM-DD"

                const nowTimeStr = now.toLocaleTimeString("en-GB", {
                    timeZone: clinicTimezone,
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                }); // "HH:MM"

                if (type === "upcoming") {
                    // Future dates OR today's remaining slots
                    visitAndClauses.push({
                        $or: [
                            { "visits.date": { $gt: todayStr } },
                            {
                                "visits.date": todayStr,
                                "visits.time": { $gte: nowTimeStr },
                            },
                        ],
                    });
                } else {
                    // Past dates OR today's already-passed slots
                    visitAndClauses.push({
                        $or: [
                            { "visits.date": { $lt: todayStr } },
                            {
                                "visits.date": todayStr,
                                "visits.time": { $lt: nowTimeStr },
                            },
                        ],
                    });
                }
            }

            // ── User-supplied date range filter ──────────────────────────
            if (startDate || endDate) {
                const rangeClause = {};
                if (startDate) {
                    if (!isValidDate(startDate)) {
                        return res.status(400).json({
                            success: false,
                            error: "Invalid startDate",
                        });
                    }
                    rangeClause.$gte = startDate;
                }
                if (endDate) {
                    if (!isValidDate(endDate)) {
                        return res.status(400).json({
                            success: false,
                            error: "Invalid endDate",
                        });
                    }
                    rangeClause.$lte = endDate;
                }
                visitAndClauses.push({ "visits.date": rangeClause });
            }

            // ── Payment filter ───────────────────────────────────────────
            if (payments) {
                const ids = payments.split(",");
                const validIds = ids.filter((id) =>
                    mongoose.Types.ObjectId.isValid(id),
                );
                if (!validIds.length) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid payment IDs",
                    });
                }
                visitAndClauses.push({
                    "visits.paymentMethodId": {
                        $in: validIds.map(
                            (id) => new mongoose.Types.ObjectId(id),
                        ),
                    },
                });
            }

            // ── Status filter ────────────────────────────────────────────
            if (status) {
                const statusArray = status.split(",");
                const invalid = statusArray.filter(
                    (s) => !VALID_STATUS.includes(s),
                );
                if (invalid.length) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid status filter",
                    });
                }
                visitAndClauses.push({
                    "visits.status": { $in: statusArray },
                });
            }

            // ── Service filter ───────────────────────────────────────────
            if (services) {
                const rawList = services.split(",");
                if (rawList.length > MAX_SERVICE_FILTER_ENTRIES) {
                    return res.status(400).json({
                        success: false,
                        error: `Service filter exceeds maximum of ${MAX_SERVICE_FILTER_ENTRIES} entries`,
                    });
                }
                const serviceList = [];
                for (const entry of rawList) {
                    if (typeof entry !== "string") {
                        return res.status(400).json({
                            success: false,
                            error: "Service filter entries must be strings",
                        });
                    }
                    const trimmed = entry.trim();
                    if (trimmed.length === 0) continue;
                    if (trimmed.length > MAX_SERVICE_NAME_LENGTH) {
                        return res.status(400).json({
                            success: false,
                            error: `Service name too long (max ${MAX_SERVICE_NAME_LENGTH} characters)`,
                        });
                    }
                    serviceList.push(trimmed);
                }
                if (serviceList.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: "Service filter contains no valid entries",
                    });
                }
                visitAndClauses.push({
                    "visits.service": {
                        $elemMatch: { name: { $in: serviceList } },
                    },
                });
            }

            // ── Gender filter ────────────────────────────────────────────
            const genderLower = gender?.toLowerCase();
            if (gender && !VALID_GENDER.includes(genderLower)) {
                return res.status(400).json({ error: "Invalid gender filter" });
            }

            // ── Collapse visitAndClauses into a single $match ────────────
            const visitMatch =
                visitAndClauses.length === 1
                    ? visitAndClauses[0]
                    : visitAndClauses.length > 1
                      ? { $and: visitAndClauses }
                      : null;

            // ── Sort direction: upcoming ASC, everything else DESC ────────
            const sortStage =
                type === "upcoming"
                    ? { "visits.date": 1, "visits.time": 1 }
                    : { "visits.date": -1, "visits.time": -1 };

            const pipeline = [
                { $match: matchStage },

                {
                    $lookup: {
                        from: "docs",
                        localField: "doctor",
                        foreignField: "_id",
                        as: "doc",
                    },
                },
                { $unwind: "$doc" },

                {
                    $lookup: {
                        from: "patients",
                        localField: "patient",
                        foreignField: "_id",
                        as: "patient",
                    },
                },
                { $unwind: "$patient" },

                { $unwind: "$visits" },

                ...(visitMatch ? [{ $match: visitMatch }] : []),

                ...(safeSearch
                    ? [
                          {
                              $match: {
                                  "patient.name": {
                                      $regex: safeSearch,
                                      $options: "i",
                                  },
                              },
                          },
                      ]
                    : []),

                ...(gender
                    ? [
                          {
                              $match: {
                                  "patient.gender": {
                                      $regex: `^${genderLower}$`,
                                      $options: "i",
                                  },
                              },
                          },
                      ]
                    : []),

                {
                    $addFields: {
                        paymentMethod: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$doc.paymentMethods",
                                        as: "pm",
                                        cond: {
                                            $eq: [
                                                "$$pm._id",
                                                "$visits.paymentMethodId",
                                            ],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },

                {
                    $lookup: {
                        from: "paymentcategories",
                        localField: "paymentMethod.categoryId",
                        foreignField: "_id",
                        as: "category",
                    },
                },
                {
                    $lookup: {
                        from: "paymentsubcategories",
                        localField: "paymentMethod.subCategoryId",
                        foreignField: "_id",
                        as: "subCategory",
                    },
                },

                {
                    $addFields: {
                        categoryName: { $arrayElemAt: ["$category.name", 0] },
                        subCategoryName: {
                            $arrayElemAt: ["$subCategory.name", 0],
                        },
                    },
                },

                {
                    $facet: {
                        data: [
                            { $sort: sortStage },
                            { $skip: parsedSkip },
                            { $limit: parsedLimit },
                            {
                                $project: {
                                    patientId: "$patient._id",
                                    name: "$patient.name",
                                    gender: "$patient.gender",
                                    date: "$visits.date",
                                    time: "$visits.time",
                                    categoryName: 1,
                                    subCategoryName: 1,
                                    paymentMethodId: "$visits.paymentMethodId",
                                    amount: "$visits.amount",
                                    collected: "$visits.collected",
                                    remaining: "$visits.remaining",
                                    status: "$visits.status",
                                    services: "$visits.service",
                                    invoiceNumber: "$visits.invoiceNumber",
                                },
                            },
                        ],
                        totalCount: [{ $count: "count" }],
                    },
                },
            ];

            const result = await Appointment.aggregate(pipeline);

            const data = result?.[0]?.data || [];
            const total = result?.[0]?.totalCount?.[0]?.count || 0;

            return res.json({ success: true, data, total });
        } catch (err) {
            console.error("fetchallappointments error:", err);
            return res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;

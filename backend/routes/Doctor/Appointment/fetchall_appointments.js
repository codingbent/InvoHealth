const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Appointment = require("../../../models/Appointment");
const fetchuser = require("../../../middleware/fetchuser");

router.get("/fetchall_appointments", fetchuser, async (req, res) => {
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
        } = req.query;

        const VALID_STATUS = ["Unpaid", "Paid", "Partial"];
        const VALID_GENDER = ["male", "female"];
        const escapeRegex = (s = "") =>
            s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const parsedLimit = Math.min(parseInt(limit) || 20, 100);
        const parsedSkip = parseInt(skip) || 0;

        // FIX: safeSearch was used in the pipeline below but never defined.
        // escapeRegex was also declared but never called on the search param.
        const safeSearch = search?.trim() ? escapeRegex(search.trim()) : "";

        const doctorId =
            req.user.role === "doctor" ? req.user.id : req.user.doctorId;

        const matchStage = {
            doctor: new mongoose.Types.ObjectId(doctorId),
        };

        const visitMatch = {};

        // DATE FILTER
        const isValidDate = (d) => !isNaN(new Date(d).getTime());

        const genderLower = gender?.toLowerCase();

        if (startDate || endDate) {
            visitMatch["visits.date"] = {};

            if (startDate) {
                if (!isValidDate(startDate)) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid startDate",
                    });
                }
                visitMatch["visits.date"].$gte = new Date(startDate);
            }

            if (endDate) {
                if (!isValidDate(endDate)) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid endDate",
                    });
                }

                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                visitMatch["visits.date"].$lte = end;
            }
        }

        // PAYMENT FILTER
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

            visitMatch["visits.paymentMethodId"] = {
                $in: validIds.map((id) => new mongoose.Types.ObjectId(id)),
            };
        }

        // STATUS FILTER
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

            visitMatch["visits.status"] = { $in: statusArray };
        }

        // SERVICE FILTER
        if (services) {
            const serviceList = services.split(",");

            visitMatch["visits.service"] = {
                $elemMatch: {
                    name: { $in: serviceList },
                },
            };
        }

        if (gender) {
            if (!VALID_GENDER.includes(genderLower)) {
                return res.status(400).json({ error: "Invalid gender filter" });
            }

            // visitMatch["patient.gender"] = genderLower;

            // pipeline.push({
            //     $match: { "patient.gender": gender },
            // });
        }

        const pipeline = [
            { $match: matchStage },

            // FETCH DOCTOR ONCE
            {
                $lookup: {
                    from: "docs",
                    localField: "doctor",
                    foreignField: "_id",
                    as: "doc",
                },
            },
            { $unwind: "$doc" },

            // FETCH PATIENT
            {
                $lookup: {
                    from: "patients",
                    localField: "patient",
                    foreignField: "_id",
                    as: "patient",
                },
            },
            { $unwind: "$patient" },

            // NOW UNWIND VISITS
            { $unwind: "$visits" },

            ...(Object.keys(visitMatch).length ? [{ $match: visitMatch }] : []),

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
                                  $regex: `^${gender}$`,
                                  $options: "i",
                              },
                          },
                      },
                  ]
                : []),

            // USE ALREADY FETCHED DOC
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
                    subCategoryName: { $arrayElemAt: ["$subCategory.name", 0] },
                },
            },

            {
                $facet: {
                    data: [
                        { $sort: { "visits.date": -1, "visits.time": -1 } },
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

        return res.json({
            success: true,
            data,
            total,
        });
    } catch (err) {
        console.error("fetchallappointments error:", err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;

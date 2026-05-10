const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Appointment = require("../../models/Appointment");
const fetchuser = require("../../middleware/fetchuser");
const { getSubscriptionStatus } = require("../../utils/subscription_check");
const requireSubscription = require("../../middleware/requiresubscription");
const requireDoctor = require("../../middleware/requireDoctor");

const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

router.get(
    "/dashboard/analytics",
    fetchuser,
    requireDoctor,
    requireSubscription,
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId || req.user.id;

            if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid doctor context",
                });
            }

            const { startDate, endDate, gender, payments, services } =
                req.query;

            // ── Date validation ──────────────────────────────────────────────
            let start = null;
            let end = null;

            if (startDate) {
                start = new Date(startDate);
                if (isNaN(start.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid startDate format",
                    });
                }
                start.setHours(0, 0, 0, 0);
            }

            if (endDate) {
                end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid endDate format",
                    });
                }
                end.setHours(23, 59, 59, 999);
            }

            if (start && end && end < start) {
                return res.status(400).json({
                    success: false,
                    error: "endDate cannot be before startDate",
                });
            }

            // ── Parse + validate payment IDs ─────────────────────────────────
            const paymentArr = payments
                ? payments
                      .split(",")
                      .map((s) => s.trim())
                      .filter((id) => mongoose.Types.ObjectId.isValid(id))
                      .map((id) => new mongoose.Types.ObjectId(id))
                : [];

            if (payments && paymentArr.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid payment filter IDs",
                });
            }

            // ── Parse service names ──────────────────────────────────────────
            const servicesArr = services
                ? services
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [];

            const filterByService = servicesArr.length > 0;

            // ── Build pipeline ───────────────────────────────────────────────
            const pipeline = [
                // STAGE 1: Scope to this doctor
                {
                    $match: {
                        doctor: new mongoose.Types.ObjectId(doctorId),
                    },
                },

                // STAGE 2: Join patient for gender filter
                {
                    $lookup: {
                        from: "patients",
                        localField: "patient",
                        foreignField: "_id",
                        as: "patientInfo",
                        pipeline: [{ $project: { gender: 1 } }],
                    },
                },
                {
                    $unwind: {
                        path: "$patientInfo",
                        preserveNullAndEmptyArrays: false,
                    },
                },

                // STAGE 3: Gender filter
                ...(gender
                    ? [
                          {
                              $match: {
                                  "patientInfo.gender": {
                                      $regex: `^${gender}$`,
                                      $options: "i",
                                  },
                              },
                          },
                      ]
                    : []),

                // STAGE 4: Unwind visits
                { $unwind: "$visits" },

                {
                    $addFields: {
                        _visitDate: {
                            $dateFromString: {
                                dateString: "$visits.date",
                                format: "%Y-%m-%d",
                                onError: null, // don't crash on malformed strings
                                onNull: null,
                            },
                        },
                    },
                },

                // Drop any visits where date couldn't be parsed
                { $match: { _visitDate: { $ne: null } } },

                // STAGE 5: Date filter — now uses the converted Date field
                ...(start || end
                    ? [
                          {
                              $match: {
                                  _visitDate: {
                                      ...(start ? { $gte: start } : {}),
                                      ...(end ? { $lte: end } : {}),
                                  },
                              },
                          },
                      ]
                    : []),

                // STAGE 6: Payment method filter
                ...(paymentArr.length > 0
                    ? [
                          {
                              $match: {
                                  "visits.paymentMethodId": { $in: paymentArr },
                              },
                          },
                      ]
                    : []),

                // ── Discount calculations (unchanged) ───────────────────────
                {
                    $addFields: {
                        _discountPct: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ["$visits.discount", null] },
                                        {
                                            $gt: [
                                                {
                                                    $toDouble:
                                                        "$visits.discount",
                                                },
                                                0,
                                            ],
                                        },
                                        { $gt: ["$visits.amount", 0] },
                                    ],
                                },
                                {
                                    $cond: [
                                        "$visits.isPercent",
                                        { $toDouble: "$visits.discount" },
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        {
                                                            $toDouble:
                                                                "$visits.discount",
                                                        },
                                                        "$visits.amount",
                                                    ],
                                                },
                                                100,
                                            ],
                                        },
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        _actualDiscount: {
                            $multiply: [
                                "$visits.amount",
                                { $divide: ["$_discountPct", 100] },
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        _finalAmount: {
                            $max: [
                                {
                                    $subtract: [
                                        "$visits.amount",
                                        "$_actualDiscount",
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        _collectedCapped: {
                            $max: [
                                {
                                    $min: [
                                        { $ifNull: ["$visits.collected", 0] },
                                        "$_finalAmount",
                                    ],
                                },
                                0,
                            ],
                        },
                        _discountedServices: {
                            $map: {
                                input: { $ifNull: ["$visits.service", []] },
                                as: "svc",
                                in: {
                                    name: "$$svc.name",
                                    rawAmount: "$$svc.amount",
                                    discountedAmount: {
                                        $max: [
                                            {
                                                $multiply: [
                                                    "$$svc.amount",
                                                    {
                                                        $subtract: [
                                                            1,
                                                            {
                                                                $divide: [
                                                                    "$_discountPct",
                                                                    100,
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        _pendingAmount: {
                            $max: [
                                {
                                    $subtract: [
                                        "$_finalAmount",
                                        "$_collectedCapped",
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },

                {
                    $facet: {
                        paymentSummary: [
                            {
                                $group: {
                                    _id: "$visits.paymentMethodId",
                                    total: { $sum: "$_collectedCapped" },
                                },
                            },
                            { $project: { _id: 0, type: "$_id", total: 1 } },
                        ],

                        serviceSummary: [
                            { $unwind: "$_discountedServices" },
                            ...(filterByService
                                ? [
                                      {
                                          $match: {
                                              "_discountedServices.name": {
                                                  $in: servicesArr,
                                              },
                                          },
                                      },
                                  ]
                                : []),
                            {
                                $group: {
                                    _id: "$_discountedServices.name",
                                    total: {
                                        $sum: "$_discountedServices.discountedAmount",
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    service: "$_id",
                                    total: { $round: ["$total", 2] },
                                },
                            },
                            { $sort: { total: -1 } },
                        ],

                        totalRevenue: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$visits.amount" },
                                },
                            },
                        ],

                        totalCollection: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$_collectedCapped" },
                                },
                            },
                        ],

                        totalPending: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$_pendingAmount" },
                                },
                            },
                        ],

                        totalDiscount: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$_actualDiscount" },
                                },
                            },
                        ],

                        monthlyTrend: [
                            {
                                $group: {
                                    _id: {
                                        year: { $year: "$_visitDate" },
                                        month: { $month: "$_visitDate" },
                                    },
                                    revenue: { $sum: "$visits.amount" },
                                    collected: { $sum: "$_collectedCapped" },
                                    pending: { $sum: "$_pendingAmount" },
                                },
                            },
                            { $sort: { "_id.year": 1, "_id.month": 1 } },
                            {
                                $project: {
                                    _id: 0,
                                    year: "$_id.year",
                                    month: "$_id.month",
                                    revenue: 1,
                                    collected: 1,
                                    pending: 1,
                                },
                            },
                        ],

                        totalVisits: [{ $count: "count" }],
                    },
                },
            ];

            const [result] = await Appointment.aggregate(pipeline);

            const monthlyTrend = (result.monthlyTrend || []).map((t) => ({
                ...t,
                label: `${MONTH_NAMES[t.month - 1]} ${t.year}`,
            }));

            return res.json({
                success: true,
                paymentSummary: result.paymentSummary,
                serviceSummary: result.serviceSummary,
                totalRevenue: result.totalRevenue[0]?.total || 0,
                totalCollection: result.totalCollection[0]?.total || 0,
                totalPending: result.totalPending[0]?.total || 0,
                totalVisits: result.totalVisits[0]?.count || 0,
                totalDiscount: result.totalDiscount[0]?.total || 0,
                monthlyTrend,
                serviceFilterActive: filterByService,
            });
        } catch (err) {
            console.error("[dashboard/analytics]", err);
            return res.status(500).json({
                success: false,
                message: "Dashboard analytics failed",
            });
        }
    },
);

module.exports = router;

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Appointment = require("../../models/Appointment");
var fetchuser = require("../../middleware/fetchuser");
const Doc = require("../../models/Doc");
const { getSubscriptionStatus } = require("../../utils/subscription_check");
const requireSubscription = require("../../middleware/requiresubscription");
const requireDoctor = require("../../middleware/requireDoctor");

router.get(
    "/dashboard/analytics",
    fetchuser,
    requireDoctor,
    requireSubscription,
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId || req.user.id;

            const { startDate, endDate, gender, payments, services } =
                req.query;

            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid doctor context",
                });
            }

            // MOVE HERE
            const doctor = await Doc.findById(doctorId).select("subscription");

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    error: "Doctor not found",
                });
            }
            const paymentArr = payments ? payments.split(",") : [];

            const servicesArr = services ? services.split(",") : [];

            const status = getSubscriptionStatus(doctor.subscription);

            if (status !== "active") {
                return res.status(403).json({
                    success: false,
                    error: "Subscription expired",
                });
            }
            const pipeline = [
                // Doctor scope
                {
                    $match: {
                        doctor: new mongoose.Types.ObjectId(doctorId),
                    },
                },

                // Join Patient (for gender)
                {
                    $lookup: {
                        from: "patients",
                        localField: "patient",
                        foreignField: "_id",
                        as: "patientInfo",
                    },
                },
                { $unwind: "$patientInfo" },

                // Gender filter
                ...(gender
                    ? [{ $match: { "patientInfo.gender": gender } }]
                    : []),

                // Unwind visits
                { $unwind: "$visits" },

                // Date filter
                ...(startDate || endDate
                    ? [
                          {
                              $match: {
                                  "visits.date": {
                                      ...(start && { $gte: start }),
                                      ...(end && { $lte: end }),
                                  },
                              },
                          },
                      ]
                    : []),

                // Payment filter
                ...(payments
                    ? [
                          {
                              $match: {
                                  "visits.paymentMethodId": {
                                      $in: paymentArr.map(
                                          (id) =>
                                              new mongoose.Types.ObjectId(id),
                                      ),
                                  },
                              },
                          },
                      ]
                    : []),

                // SERVICE FILTER ( MOVED HERE )
                ...(services
                    ? [
                          { $unwind: "$visits.service" },
                          {
                              $match: {
                                  "visits.service.name": {
                                      $in: servicesArr,
                                  },
                              },
                          },
                      ]
                    : []),

                {
                    $addFields: {
                        finalAmount: {
                            $max: [
                                {
                                    $subtract: [
                                        "$visits.amount",
                                        {
                                            $cond: [
                                                {
                                                    $and: [
                                                        {
                                                            $ne: [
                                                                "$visits.discount",
                                                                null,
                                                            ],
                                                        },
                                                        {
                                                            $gt: [
                                                                {
                                                                    $toDouble:
                                                                        "$visits.discount",
                                                                },
                                                                0,
                                                            ],
                                                        },
                                                    ],
                                                },
                                                {
                                                    $cond: [
                                                        "$visits.isPercent",
                                                        {
                                                            $multiply: [
                                                                "$visits.amount",
                                                                {
                                                                    $divide: [
                                                                        {
                                                                            $toDouble:
                                                                                "$visits.discount",
                                                                        },
                                                                        100,
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                        {
                                                            $toDouble:
                                                                "$visits.discount",
                                                        },
                                                    ],
                                                },
                                                0,
                                            ],
                                        },
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },

                // ================= FACET =================
                {
                    $facet: {
                        // PAYMENT SUMMARY (Collected only)
                        paymentSummary: [
                            {
                                $group: {
                                    _id: "$visits.paymentMethodId",
                                    total: {
                                        $sum: {
                                            $min: [
                                                {
                                                    $cond: [
                                                        {
                                                            $gt: [
                                                                "$visits.collected",
                                                                0,
                                                            ],
                                                        },
                                                        {
                                                            $min: [
                                                                "$visits.collected",
                                                                "$finalAmount",
                                                            ],
                                                        },
                                                        0,
                                                    ],
                                                },
                                                "$finalAmount",
                                            ],
                                        },
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    type: "$_id",
                                    total: 1,
                                },
                            },
                        ],

                        // SERVICE SUMMARY
                        serviceSummary: [
                            ...(services
                                ? []
                                : [{ $unwind: "$visits.service" }]),
                            {
                                $group: {
                                    _id: "$visits.service.name",
                                    total: { $sum: "$visits.service.amount" },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    service: "$_id",
                                    total: 1,
                                },
                            },
                        ],

                        // TOTAL REVENUE (Full billed amount)
                        totalRevenue: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$finalAmount" },
                                },
                            },
                        ],

                        // TOTAL COLLECTION (Actual collected)
                        totalCollection: [
                            {
                                $group: {
                                    _id: null,
                                    total: {
                                        $sum: {
                                            $min: [
                                                {
                                                    $cond: [
                                                        {
                                                            $gt: [
                                                                "$visits.collected",
                                                                0,
                                                            ],
                                                        },
                                                        {
                                                            $min: [
                                                                "$visits.collected",
                                                                "$finalAmount",
                                                            ],
                                                        },
                                                        0,
                                                    ],
                                                },
                                                "$finalAmount",
                                            ],
                                        },
                                    },
                                },
                            },
                        ],

                        // TOTAL PENDING
                        totalPending: [
                            {
                                $group: {
                                    _id: null,
                                    total: {
                                        $sum: {
                                            $max: [
                                                {
                                                    $subtract: [
                                                        "$finalAmount",
                                                        {
                                                            $ifNull: [
                                                                "$visits.collected",
                                                                0,
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
                        ],

                        totalDiscount: [
                            {
                                $group: {
                                    _id: null,
                                    total: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $and: [
                                                        {
                                                            $ne: [
                                                                "$visits.discount",
                                                                null,
                                                            ],
                                                        },
                                                        {
                                                            $gt: [
                                                                {
                                                                    $toDouble:
                                                                        "$visits.discount",
                                                                },
                                                                0,
                                                            ],
                                                        },
                                                    ],
                                                },
                                                {
                                                    $cond: [
                                                        "$visits.isPercent",
                                                        {
                                                            $multiply: [
                                                                "$visits.amount",
                                                                {
                                                                    $divide: [
                                                                        {
                                                                            $toDouble:
                                                                                "$visits.discount",
                                                                        },
                                                                        100,
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                        {
                                                            $toDouble:
                                                                "$visits.discount",
                                                        },
                                                    ],
                                                },
                                                0,
                                            ],
                                        },
                                    },
                                },
                            },
                        ],

                        monthlyTrend: [
                            {
                                $group: {
                                    _id: {
                                        year: { $year: "$visits.date" },
                                        month: { $month: "$visits.date" },
                                    },
                                    total: { $sum: "$finalAmount" }, // or collected if you prefer
                                },
                            },
                            {
                                $sort: {
                                    "_id.year": 1,
                                    "_id.month": 1,
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    year: "$_id.year",
                                    month: "$_id.month",
                                    total: 1,
                                },
                            },
                        ],

                        totalVisits: [{ $count: "count" }],
                    },
                },
            ];

            const analytics = await Appointment.aggregate(pipeline);
            const result = analytics[0];

            res.json({
                success: true,
                paymentSummary: result.paymentSummary,
                serviceSummary: result.serviceSummary,
                totalRevenue: result.totalRevenue[0]?.total || 0,
                totalCollection: result.totalCollection[0]?.total || 0,
                totalPending: result.totalPending[0]?.total || 0,
                totalVisits: result.totalVisits[0]?.count || 0,
                totalDiscount: result.totalDiscount[0]?.total || 0,
                monthlyTrend: result.monthlyTrend || [],
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: "Dashboard analytics failed",
            });
        }
    },
);

module.exports = router;

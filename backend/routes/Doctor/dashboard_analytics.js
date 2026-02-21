const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Appointment = require("../../models/Appointment");
var fetchuser = require("../../middleware/fetchuser");

router.get("/dashboard/analytics", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { payments, services, gender, startDate, endDate } = req.query;

        const pipeline = [
            // 🔒 Doctor scope
            {
                $match: {
                    doctor: new mongoose.Types.ObjectId(doctorId),
                },
            },

            // 🔗 Join Patient (for gender)
            {
                $lookup: {
                    from: "patients",
                    localField: "patient",
                    foreignField: "_id",
                    as: "patientInfo",
                },
            },
            { $unwind: "$patientInfo" },

            // 🔹 Gender filter
            ...(gender ? [{ $match: { "patientInfo.gender": gender } }] : []),

            // 🔹 Unwind visits
            { $unwind: "$visits" },

            // 🔹 Date filter
            ...(startDate || endDate
                ? [
                      {
                          $match: {
                              "visits.date": {
                                  ...(startDate && {
                                      $gte: new Date(startDate),
                                  }),
                                  ...(endDate && {
                                      $lte: new Date(endDate),
                                  }),
                              },
                          },
                      },
                  ]
                : []),

            // 🔹 Payment filter
            ...(payments
                ? [
                      {
                          $match: {
                              "visits.payment_type": {
                                  $in: payments.split(","),
                              },
                          },
                      },
                  ]
                : []),

            // 🔹 SERVICE FILTER (🔥 MOVED HERE 🔥)
            ...(services
                ? [
                      { $unwind: "$visits.service" },
                      {
                          $match: {
                              "visits.service.name": {
                                  $in: services.split(","),
                              },
                          },
                      },
                  ]
                : []),

            // ================= FACET =================
            {
                $facet: {
                    // PAYMENT SUMMARY (Collected only)
                    paymentSummary: [
                        {
                            $group: {
                                _id: "$visits.payment_type",
                                total: {
                                    $sum: {
                                        $ifNull: [
                                            "$visits.collected",
                                            "$visits.amount",
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
                        ...(services ? [] : [{ $unwind: "$visits.service" }]),
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
                                total: { $sum: "$visits.amount" },
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
                                        $ifNull: [
                                            "$visits.collected",
                                            "$visits.amount",
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
                                                    "$visits.amount",
                                                    {
                                                        $ifNull: [
                                                            "$visits.collected",
                                                            "$visits.amount",
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
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Dashboard analytics failed",
        });
    }
});

module.exports = router;

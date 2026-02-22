import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export default function Alert({ alert, clearAlert }) {
    const icons = {
        success: "✅",
        danger: "❌",
        warning: "⚠️",
        info: "ℹ️",
    };

    // Auto close after 4 seconds
    useEffect(() => {
        if (!alert) return;

        const timer = setTimeout(() => {
            clearAlert();
        }, 4000);

        return () => clearTimeout(timer);
    }, [alert, clearAlert]);

    return (
        <div className="alert-container">
            <AnimatePresence>
                {alert && (
                    <motion.div
                        key="alert"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.3 }}
                        className={`modern-alert ${alert.type}`}
                    >
                        <span className="alert-icon">
                            {icons[alert.type] || "ℹ️"}
                        </span>
                        <span className="alert-text">{alert.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

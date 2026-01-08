import { motion, AnimatePresence } from "framer-motion";

export default function Alert({ alert }) {
    if (!alert) return <div style={{ height: "56px" }} />;

    const icons = {
        success: "✅",
        danger: "❌",
        warning: "⚠️",
        info: "ℹ️",
    };

    return (
        <div style={{ height: "56px" }}>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className={`modern-alert ${alert.type}`}
                >
                    <span className="alert-icon">
                        {icons[alert.type] || "ℹ️"}
                    </span>
                    <span className="alert-text z-100">{alert.msg}</span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

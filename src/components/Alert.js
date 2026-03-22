import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

export default function Alert({ alert, clearAlert }) {
    const icons = {
        success: <CheckCircle size={20} />,
        danger: <XCircle size={20} />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />,
    };

    useEffect(() => {
        if (!alert) return;

        const timer = setTimeout(() => {
            clearAlert();
        }, 3500);

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
                            {icons[alert.type] || <Info size={20} />}
                        </span>
                        <span className="alert-text">{alert.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

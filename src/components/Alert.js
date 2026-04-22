import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import "../css/Alert.css"

const DURATION = 3500;

export default function Alert({ alert, clearAlert }) {
    // eslint-disable-next-line
    const [progress, setProgress] = useState(100);

    const icons = {
        success: <CheckCircle size={20} />,
        danger: <XCircle size={20} />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />,
    };

    useEffect(() => {
        if (!alert) return;

        setProgress(100);

        const timer = setTimeout(clearAlert, DURATION);

        // trigger animation AFTER render
        const animation = setTimeout(() => {
            setProgress(0);
        }, 50);

        return () => {
            clearTimeout(timer);
            clearTimeout(animation);
        };
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
                        <div className="alert-progress-bar">
                            <div className="alert-progress-fill" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

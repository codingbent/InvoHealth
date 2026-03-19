const PasswordInput = ({
    label,
    placeholder,
    value,
    onChange,
    typeKey,
    showPasswords,
    setShowPasswords,
}) => {
    const isVisible = showPasswords[typeKey];

    return (
        <div>
            <label className="form-label small text-theme-secondary">
                {label}
            </label>

            <div className="password-wrapper">
                <input
                    type={isVisible ? "text" : "password"}
                    className="form-control rounded-3 pe-5"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                />

                <button
                    type="button"
                    className="eye-btn"
                    onClick={() =>
                        setShowPasswords((prev) => ({
                            ...prev,
                            [typeKey]: !prev[typeKey],
                        }))
                    }
                >
                    <span className={`eye-icon ${isVisible ? "show" : ""}`}>
                        {isVisible ? (
                            <EyeOff size={18} />
                        ) : (
                            <Eye size={18} />
                        )}
                    </span>
                </button>
            </div>
        </div>
    );
};
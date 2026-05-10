import { MapPin, Phone, Stethoscope } from "lucide-react";
import "../../css/patient/DoctorCard.css";

const capitalize = (str = "") => str.charAt(0).toUpperCase() + str.slice(1);

const DoctorCard = ({ doc, onClick }) => {
    const specializations = Array.isArray(doc.specialization)
        ? doc.specialization.slice(0, 2)
        : [doc.specialization];

    return (
        <>
            <div className="dc-card" onClick={onClick}>
                {/* LEFT */}
                <div className="dc-left">
                    <div className="dc-avatar">
                        {doc.name?.[0]?.toUpperCase() || "D"}
                    </div>
                </div>

                {/* CENTER */}
                <div className="dc-center">
                    <div className="dc-name">{doc.name}</div>

                    <div className="dc-spec">
                        <Stethoscope size={14} />
                        {specializations.map(capitalize).join(", ") ||
                            "General"}
                    </div>

                    <div className="dc-meta">
                        <div className="dc-meta-item">
                            <Phone size={13} />
                            {doc.phone || "N/A"}
                        </div>

                        <div className="dc-meta-item">
                            <MapPin size={13} />
                            {doc.address?.city || "—"}
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="dc-right">→</div>
            </div>
        </>
    );
};

export default DoctorCard;

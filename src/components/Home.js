import Patient from "../components/Patient";

export default function Home(props) {
    const {
        showAlert,
        currency,
        usage,
        doctor,
        services,
        availability,
    } = props;

    return (
        <>
            <Patient
                showAlert={showAlert}
                currency={currency}
                usage={usage}
                doctor={doctor}
                services={services}
                availability={availability}
            />
        </>
    );
}

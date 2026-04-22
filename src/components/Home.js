import Patient from "../components/Patient";

export default function Home(props) {
    const {
        showAlert,
        currency,
        usage,
        //  updateUsage,
        services,
        availability,
    } = props;

    return (
        <>
            <Patient
                showAlert={showAlert}
                currency={currency}
                usage={usage}
                // updateUsage={updateUsage}
                services={services}
                availability={availability}
            />
        </>
    );
}

import { useEffect, useState } from "react";
import { fetchCountries } from "../api/country.api";

const CountrySelect = ({ value, onChange }) => {
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCountries = async () => {
            try {
                const data = await fetchCountries();

                // Sort alphabetically by name
                const sorted = data.sort((a, b) =>
                    a.name.localeCompare(b.name),
                );

                setCountries(sorted);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadCountries();
    }, []);

    if (loading) {
        return <div>Loading countries...</div>;
    }

    return (
        <select
            className="sg-country-select"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="" disabled>
                Select Country
            </option>

            {countries.map((c) => (
                <option key={c.code} value={c.code}>
                    {c.name} ({c.currency})
                </option>
            ))}
        </select>
    );
};

export default CountrySelect;

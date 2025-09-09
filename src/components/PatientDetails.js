import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function PatientDetails() {
  const { id } = useParams();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      const response = await fetch(`http://localhost:5001/api/auth/patientdetails/${id}`);
      const data = await response.json();
    //   //console.log(data);
      
      setDetails(data);
    };
    fetchDetails();
}, [id]);

if (!details) return <p>Loading patient details...</p>;
//console.log(details);

  return (
    <div>
      <h2>{details.name}</h2>
      <p>Number: {details.number}</p>
      <p>Age: {details.age}</p>
    </div>
  );
}

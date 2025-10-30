import { useEffect, useState } from "react";
import axios from "axios";

const AppointmentTable = () => {
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    axios.get("/api/report/fetch-all-visits").then((res) => {
      setVisits(res.data);
    });
  }, []);

  return (
    <table border="1">
      <thead>
        <tr>
          <th>Patient Name</th>
          <th>Doctor</th>
          <th>Date</th>
          <th>Payment Type</th>
          <th>Invoice No</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {visits.map((v, i) => (
          <tr key={i}>
            <td>{v.patientName}</td>
            <td>{v.doctorName}</td>
            <td>{new Date(v.date).toLocaleDateString()}</td>
            <td>{v.paymentType}</td>
            <td>{v.invoiceNumber}</td>
            <td>{v.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AppointmentTable;
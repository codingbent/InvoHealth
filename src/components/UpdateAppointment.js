import { useState, useEffect } from "react";

export default function UpdateAppointmentModal({ appointment, patientId, servicesList, onClose, onUpdate }) {
  const [date, setDate] = useState(
    appointment.date ? new Date(appointment.date).toISOString().slice(0, 10) : ""
  );
  const [selectedServices, setSelectedServices] = useState(appointment.service || []);
  const [serviceAmounts, setServiceAmounts] = useState([]);
  const [totalAmount, setTotalAmount] = useState(appointment.amount || 0);

  // Initialize service amounts when modal opens
  useEffect(() => {
    const amounts = (appointment.service || []).map((s) => {
      if (typeof s === "object") return s.amount || 0;
      const srv = servicesList.find((svc) => svc.name === s);
      return srv ? srv.amount : 0;
    });
    setServiceAmounts(amounts);
    setTotalAmount(amounts.reduce((a, b) => a + b, 0));
  }, [appointment, servicesList]);

  const handleCheckboxChange = (serviceName, checked) => {
    let updatedServices = [...selectedServices];
    let updatedAmounts = [...serviceAmounts];

    if (checked) {
      updatedServices.push(serviceName);
      const defaultAmount = servicesList.find(s => s.name === serviceName)?.amount || 0;
      updatedAmounts.push(defaultAmount);
    } else {
      const index = updatedServices.indexOf(serviceName);
      if (index > -1) {
        updatedServices.splice(index, 1);
        updatedAmounts.splice(index, 1);
      }
    }

    setSelectedServices(updatedServices);
    setServiceAmounts(updatedAmounts);
    setTotalAmount(updatedAmounts.reduce((a, b) => a + b, 0));
  };

  const handleAmountChange = (index, value) => {
    const updatedAmounts = [...serviceAmounts];
    updatedAmounts[index] = Number(value);
    setServiceAmounts(updatedAmounts);
    setTotalAmount(updatedAmounts.reduce((a, b) => a + b, 0));
  };

  const handleUpdate = async () => {
    const res = await fetch(`/api/auth/updateappointment/${patientId}/${appointment._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "auth-token": localStorage.getItem("token") },
      body: JSON.stringify({
        date,
        service: selectedServices.map((name, i) => ({ name, amount: serviceAmounts[i] })),
        amount: totalAmount
      }),
    });

    const data = await res.json();
    if (res.ok) {
      onUpdate(data);
      onClose();
    } else {
      alert("Error: " + (data.message || "Update failed"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
        <h2 className="text-lg font-bold mb-4">Update Appointment</h2>

        <label className="block mb-2">Date</label>
        <input
          type="date"
          className="border p-2 w-full mb-3"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label className="block mb-2">Services</label>
        <div className="mb-3 max-h-40 overflow-y-auto border p-2 rounded">
          {servicesList.map((srv) => {
            const checked = selectedServices.includes(srv.name);
            const index = selectedServices.indexOf(srv.name);
            return (
              <div key={srv._id} className="flex justify-between items-center mb-1">
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleCheckboxChange(srv.name, e.target.checked)}
                    className="mr-2"
                  />
                  {srv.name}
                </label>
                {checked && (
                  <input
                    type="number"
                    className="border p-1 w-20"
                    value={serviceAmounts[index]}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <label className="block mb-3">Total Amount: {totalAmount}</label>

        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={onClose}>
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={handleUpdate}>
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
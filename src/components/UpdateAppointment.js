import { useState, useEffect } from "react";

export default function UpdateAppointmentModal({ appointment, patientId, servicesList, onClose, onUpdate }) {
  // Extract visit data
  const visit = appointment; // pass the specific visit object from parent (appointment.visits[i])
  const [date, setDate] = useState(
    visit.date ? new Date(visit.date).toISOString().slice(0, 10) : ""
  );
  const [selectedServices, setSelectedServices] = useState(visit.service || []);
  const [serviceAmounts, setServiceAmounts] = useState([]);
  const [totalAmount, setTotalAmount] = useState(visit.amount || 0);

  // Initialize amounts on mount
  useEffect(() => {
    const amounts = (visit.service || []).map((s) => s.amount || 0);
    setServiceAmounts(amounts);
    setTotalAmount(amounts.reduce((a, b) => a + b, 0));
  }, [visit]);

  const handleCheckboxChange = (serviceName, checked) => {
    let updatedServices = [...selectedServices];
    let updatedAmounts = [...serviceAmounts];

    if (checked) {
      const serviceObj = servicesList.find(s => s.name === serviceName);
      updatedServices.push({ name: serviceName, id: serviceObj?._id || null, amount: serviceObj?.amount || 0 });
      updatedAmounts.push(serviceObj?.amount || 0);
    } else {
      const index = updatedServices.findIndex(s => s.name === serviceName);
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
    const updatedServices = [...selectedServices];
    updatedServices[index].amount = Number(value);

    setServiceAmounts(updatedAmounts);
    setSelectedServices(updatedServices);
    setTotalAmount(updatedAmounts.reduce((a, b) => a + b, 0));
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/auth/updateappointment/${appointment.appointmentId}/${visit._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token")
        },
        body: JSON.stringify({
          date,
          service: selectedServices,
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
    } catch (err) {
      console.error(err);
      alert("Something went wrong!");
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
            const checked = selectedServices.some(s => s.name === srv.name);
            const index = selectedServices.findIndex(s => s.name === srv.name);
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
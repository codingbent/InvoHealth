import { useState } from "react";

export default function UpdateAppointmentModal({ appointment, patientId, onClose, onUpdate }) {
  const [date, setDate] = useState(
    appointment.date ? new Date(appointment.date).toISOString().slice(0, 16) : ""
  );
  const [service, setService] = useState(appointment.service || []);
  const [amount, setAmount] = useState(appointment.amount || "");

  const handleServiceChange = (e) => {
    setService(e.target.value.split(",").map((s) => s.trim())); // comma-separated input
  };

  const handleUpdate = async () => {
    const res = await fetch(`/api/auth/updateappointment/${patientId}/${appointment._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json","auth-token":localStorage.getItem("token") },
      body: JSON.stringify({ date, service, amount }),
    });

    const data = await res.json();
    if (res.ok) {
      onUpdate(data); // refresh UI
      onClose();
    } else {
      alert("Error: " + (data.message || "Update failed"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
        <h2 className="text-lg font-bold mb-4">Update Appointment</h2>

        <label className="block mb-2">Date</label>
        <input
          type="datetime-local"
          className="border p-2 w-full mb-3"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label className="block mb-2">Services ,</label>
        <input
          type="text"
          className="border p-2 w-full mb-3"
          value={service.join(", ")}
          onChange={handleServiceChange}
        />

        <label className="block mb-2">Amount</label>
        <input
          type="number"
          className="border p-2 w-full mb-3"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

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
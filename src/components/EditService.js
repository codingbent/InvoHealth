import { useState, useEffect } from "react";

const EditService = ({ showAlert }) => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  // Fetch all services on load
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
          headers: {
            "auth-token": localStorage.getItem("token"),
          },
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setServices(data);
        }
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    };
    fetchServices();
  }, [API_BASE_URL]);

  // Set form fields when selecting a service
  const handleSelect = (id) => {
    const service = services.find((s) => s._id === id);
    if (service) {
      setSelectedService(service._id);
      setName(service.name);
      setAmount(service.amount);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService) {
      showAlert("Please select a service to edit", "warning");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/updateservice/${selectedService}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
          body: JSON.stringify({ name, amount }),
        }
      );

      const data = await response.json();
      if (data.success) {
        showAlert("Service updated successfully", "success");
        window.location.reload();
      } else {
        showAlert("Failed to update service", "danger");
      }
    } catch (err) {
      console.error("Error updating service:", err);
      showAlert("Error updating service", "danger");
    }
  };

  return (
    <div className="modal-content">
      <div className="modal-header">
        <h5 className="modal-title" id="editServiceModalLabel">
          Edit Service
        </h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="modal"
          aria-label="Close"
        ></button>
      </div>
      <div className="modal-body">
        {/* Dropdown to select a service */}
        <select
          className="form-select mb-2"
          value={selectedService}
          onChange={(e) => handleSelect(e.target.value)}
        >
          <option value="">Select Service</option>
          {services.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Editable fields */}
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Service Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          className="form-control mb-2"
          placeholder="Service Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary"
          data-bs-dismiss="modal"
        >
          Close
        </button>
        <button type="button" className="btn btn-success" onClick={handleSubmit}>
          Update
        </button>
      </div>
    </div>
  );
};

export default EditService;
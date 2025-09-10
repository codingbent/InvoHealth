import { useState, useRef, useEffect } from "react";

const AddServices = ({ showAlert }) => {
  const [service, setService] = useState({ name: "", amount: "" });
  const { name, amount } = service;

  const modalRef = useRef(null);

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  // Initialize modal instance
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.bsModal = window.bootstrap.Modal.getOrCreateInstance(
        modalRef.current
      );
    }
  }, []);

  // Open modal programmatically
  const openModal = () => {
    if (modalRef.current?.bsModal) modalRef.current.bsModal.show();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/createservice`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ name, amount }),
      });

      const json = await response.json();

      if (json.success) {
        setService({ name: "", amount: "" });
        showAlert("Successfully Added", "success");
        if (modalRef.current?.bsModal) modalRef.current.bsModal.hide();
      } else {
        setService({ name: "", amount: "" });
        showAlert(json.error || "Already exists", "danger");
        if (modalRef.current?.bsModal) modalRef.current.bsModal.hide();
      }
    } catch (err) {
      console.error(err);
      showAlert("Server error", "danger");
    }
  };

  const onChange = (e) => {
    setService({ ...service, [e.target.name]: e.target.value });
  };

  return (
    <>
      {/* Trigger button */}
      <button className="btn btn-primary mb-3" onClick={openModal}>
        Add Service
      </button>

      {/* Modal */}
      <div
        className="modal fade"
        id="serviceModal"
        tabIndex="-1"
        aria-hidden="true"
        ref={modalRef}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h1 className="modal-title fs-5">Add Service</h1>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Service Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Service Name"
                    name="name"
                    required
                    onChange={onChange}
                    value={name}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter amount (optional)"
                    name="amount"
                    onChange={onChange}
                    value={amount}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Service
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddServices;
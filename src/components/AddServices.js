import { useState } from "react";

const AddServices = (props) => {
    const [service, setService] = useState({ name: "", amount: "" });
    const { name, amount } = service;

const API_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://gmsc-backend.onrender.com"
  : "http://localhost:5001";

    const handlesubmit = async (e) => {
        e.preventDefault();
        const response = await fetch(
            `${API_BASE_URL}/api/auth/createservice`,
            {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                    "auth-token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U"
                },
                body: JSON.stringify({ name, amount }),
            }
        );
        const json = await response.json();
        //console.log(json);
        if (json.success) {
            setService({ name: "", amount: "" });
            props.showAlert("Successfully Added", "success");
            document.querySelector("#serviceModal .btn-close").click();
            window.location.reload();
        } else {
            setService({ name: "", amount: "" });
            props.showAlert("Already exists", "danger");
            document.querySelector("#serviceModal .btn-close").click();
        }
    };
    const onChange = (e) => {
        setService({ ...service, [e.target.name]: e.target.value });
    };
    return (
        <form onSubmit={handlesubmit}>
            <div className="modal-content">
                <div className="modal-header">
                    <h1 className="modal-title fs-5" id="exampleModalLabel">
                        Add Service
                    </h1>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="modal-body">
                    <div className="mb-3">
                        <label
                            htmlFor="formGroupExampleInput"
                            className="form-label"
                        >
                            Service Name
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            id="formGroupExampleInput"
                            placeholder="Enter Service Name"
                            name="name"
                            required
                            onChange={onChange}
                            value={name}
                        />
                    </div>
                    <div className="mb-3">
                        <label
                            htmlFor="formGroupExampleInput2"
                            className="form-label"
                        >
                            Amount
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            id="formGroupExampleInput2"
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
        </form>
    );
};

export default AddServices;

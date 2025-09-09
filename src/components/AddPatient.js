import { useState } from "react";
import ServiceList from "./ServiceList";
const AddPatient = (props) => {
    const [patient, setPatient] = useState({
        name: "",
        service: [],
        number: "",
        amount: "",
        age:""
    });

    const { name, service, number, amount ,age } = patient;

    const handlesubmit = async (e) => {
        e.preventDefault();
        
        const response = await fetch("http://localhost:5001/api/auth/addpatient", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
                "auth-token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U"
            },
            body: JSON.stringify({ name, service, number, amount,age }),
        });

        const json = await response.json();
        //console.log(json);

        if (json.success) {
            setPatient({ name: "", service: [], number: "", amount: "" ,age:""});
            props.showAlert("Patient Added Successfully", "success");
            document.querySelector("#patientModal .btn-close").click();
        } else {
            document.querySelector("#patientModal .btn-close").click();
            props.showAlert(json.error || "Invalid input", "danger");
        }
    };

    const onChange = (e) => {
        setPatient({ ...patient, [e.target.name]: e.target.value });
    };

    return (
        <form onSubmit={handlesubmit}>
            <div className="modal-content">
                <div className="modal-header">
                    <h1 className="modal-title fs-5" id="exampleModalLabel">
                        Add Patient
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
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter Name"
                            name="name"
                            required
                            onChange={onChange}
                            value={name}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Service</label>
                        {/* <input
                            type="text"
                            className="form-control"
                            placeholder="Enter Service"
                            name="service"
                            onChange={onChange}
                            value={service}
                        /> */}
                        <ServiceList
                            onSelect={(value, checked) => {
                                setPatient((prev) => {
                                let updatedServices;
                                if (checked) {
                                    updatedServices = [...prev.service, value];
                                } else {
                                    updatedServices = prev.service.filter((s) => s !== value);
                                }
                                return { ...prev, service: updatedServices };
                                });
                            }}
                            />

                    </div>
                    <div className="mb-3">
                        <label className="form-label">Number</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="Enter Number (10 digits)"
                            name="number"
                            onChange={onChange}
                            value={number}
                            minLength={10}
                            maxLength={10}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Amount</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="Enter Amount"
                            name="amount"
                            onChange={onChange}
                            value={amount}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Age</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="Enter Age"
                            name="age"
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
                        Add Patient
                    </button>
                </div>
            </div>
        </form>
    );
};

export default AddPatient;

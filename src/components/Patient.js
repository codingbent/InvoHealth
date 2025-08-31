// import { Link } from "react-router";
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";

const Patient = (props) => {
    const { showAlert } = props;
    return (
        <>
            <div className="mt-3 d-grid gap-2 d-md-flex justify-content-md-center">
                {/* Modal for Adding patients*/}
                <button
                    type="button"
                    className="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#patientModal"
                >
                    Add patient
                </button>
                <div
                    className="modal fade"
                    id="patientModal"
                    tabIndex="-1"
                    aria-labelledby="patientModalLabel"
                    aria-hidden="true"
                >
                    <div className="modal-dialog">
                        <AddPatient showAlert={showAlert} />
                    </div>
                </div>

                {/* Modal for Adding services*/}
                <button
                    type="button"
                    className="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#serviceModal"
                >
                    Add Service
                </button>
                <div
                    className="modal fade"
                    id="serviceModal"
                    tabIndex="-1"
                    aria-labelledby="serviceModalLabel"
                    aria-hidden="true"
                >
                    <div className="modal-dialog">
                        <AddServices showAlert={showAlert} />
                    </div>
                </div>
            </div>
            {localStorage.getItem('token')!=null
            
            ?
            <table class="table container">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Name</th>
                        <th scope="col">Amount</th>
                        <th scope="col">Number</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row">1</th>
                        <td>Mark</td>
                        <td>Otto</td>
                        <td>@mdo</td>
                    </tr>
                    <tr>
                        <th scope="row">2</th>
                        <td>Jacob</td>
                        <td>Thornton</td>
                        <td>@fat</td>
                    </tr>
                    <tr>
                        <th scope="row">3</th>
                        <td>John</td>
                        <td>Doe</td>
                        <td>@social</td>
                    </tr>
                </tbody>
            </table>
            :
            <h1>Login to see Patient</h1>
        }
        </>
    );
};

export default Patient;

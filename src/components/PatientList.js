import {useEffect,useState} from "react"
import {useNavigate} from "react-router-dom"
import PatientDetails from "./PatientDetails";
export default function PatientList(){
    const navigate=useNavigate();
    const [patient,setPatient]=useState([]);
      const [selectedId, setSelectedId] = useState(null);
    useEffect(()=>{
        const list =  async ()=>{
        const response = await fetch("http://localhost:5001/api/auth/fetchallpatients",{
            method:"GET",
            header:{
                "Content-Type":"application/json",
                "auth-token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U"
            }
        });
        const json =await response.json();
        //console.log(json);
        setPatient(json)
    }
    list();
    },[]
    )
    
    return (
        <>
        <nav aria-label="Page navigation example" className="mt-3">
            <ul className="pagination justify-content-center ">
                <li className="page-item">
                <a className="page-link" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
                </li>
                <li className="page-item"><a className="page-link" href="#">1</a></li>
                <li className="page-item"><a className="page-link" href="#">2</a></li>
                <li className="page-item"><a className="page-link" href="#">3</a></li>
                <li className="page-item">
                <a className="page-link" href="#" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
                </li>
            </ul>
        </nav>
        <table className="table container">
                <thead>
                    <tr>
                        <th scope="col">Serial number</th>
                        <th scope="col">Name</th>
                        {/* <th scope="col">Amount</th> */}
                    </tr>
                </thead>
                <tbody>
                    {patient.map((s, index) => (
          <tr
            key={index}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/patient/${s._id}`)} 
          >
            <td>{index + 1}</td>
            <td>{s.name}</td>
          </tr>
        ))}
                    </tbody>
                    {selectedId && <PatientDetails id={selectedId} />}
            </table>
        </>
    )
}
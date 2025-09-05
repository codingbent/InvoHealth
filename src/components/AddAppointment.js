import { useState } from "react";

const AddAppointment=(props)=>{
    const [patients,setpatients]=useState({});
    const handlesubmit= async(e)=>{
        e.preventDefault();
        const response=await fetch("http://localhost:5001/api/auth/fetchallpatients",{
            method:"GET",
            headers:{
                "Content-Type":"application/json",
                "auth-token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U"
            },
            // body :JSON.stringify(response)
            
        })
        const json = await response.json();
        setpatients(json[0])
        console.log(patients);
    }
return (
    <>
     <form onSubmit={handlesubmit}>
            <div class="mb-3">
  <label for="formGroupExampleInput" class="form-label">Example label</label>
  <input type="text" class="form-control" id="formGroupExampleInput" placeholder="Example input placeholder"/>
</div>
<div class="mb-3">
  <label for="formGroupExampleInput2" class="form-label">Another label</label>
  <input type="text" class="form-control" id="formGroupExampleInput2" placeholder="Another input placeholder"/>
</div>
        </form>
    </>
)
}

export default AddAppointment;
import { useState } from "react";
import { useNavigate } from "react-router";
const  Signup=(props) =>{
  
  const [credentials,setcredentials]=useState({name:"",email:"",password:"",cpassword:""});
  let navigate=useNavigate();
  const handlesubmit=async (e)=>{
    e.preventDefault();
    const {name,email,password}=credentials
    const http="http://"
    const response=await fetch(`${http}localhost:5001/api/auth/createdoc`,{
    method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                email,
                password,
            })
          })
          const json =await response.json()
          //console.log(json);
          
          if(json.success){
            localStorage.setItem('token',json.authtoken)
            localStorage.setItem('name',name)
            navigate("/")
            props.showAlert("Successfully Signed in","success")
          }
          else{
      props.showAlert("Invalid Credentials","danger")
    }
}
const onChange = (e) => {
        setcredentials({ ...credentials, [e.target.name]: e.target.value });
    };
    return (
        <div className="container mt-5">
            <form onSubmit={handlesubmit}>
              <div className="mb-3">
                    <label htmlFor="exampleFormControlInput1" className="form-label">
                        Name
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="exampleFormControlInput1"
                        placeholder="Full Name"
                        name="name"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="exampleFormControlInput2" className="form-label">
                        Email address
                    </label>
                    <input
                        type="email"
                        className="form-control"
                        id="exampleFormControlInput2"
                        placeholder="name@example.com"
                        name="email"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="inputPassword5" className="form-label">
                        Password
                    </label>
                    <input
                        type="password"
                        id="inputPassword5"
                        className="form-control"
                        aria-describedby="passwordHelpBlock"
                        name="password"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="inputPassword" className="form-label">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        id="inputPassword"
                        className="form-control"
                        aria-describedby="passwordHelpBlock"
                        name="cpassword"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                  <button type="submit" className="btn btn-primary">Sign Up</button>
                </div>
            </form>
        </div>
    );
}
export default Signup;
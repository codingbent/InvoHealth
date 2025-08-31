// import react from "react"
import Patient from "../components/Patient"
export default function Home(props){
    const {showAlert}=props;
    return (
        <>
            <Patient showAlert={showAlert}/>
        </>
    )
}
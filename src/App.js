import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./components/Home";
import About from "./components/About";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Navbar from "./components/Navbar";
import Alert from "./components/Alert";
import PatientDetails from "./components/PatientDetails";
import DoctorProfile from "./components/DoctorProfile";

function App() {
    const [alert, setalert] = useState(null);
    const showAlert = (message, type) => {
        setalert({
            msg: message,
            type: type,
        });
        setTimeout(() => setalert(null), 10000);
    };

    return (
        <>
            <BrowserRouter>
                <Navbar showAlert={showAlert} />
                <Alert alert={alert} />
                <Routes>
                    <Route path="/" element={<Home showAlert={showAlert} />} />
                    <Route path="/about" element={<About />} />
                    <Route
                        path="/patient/:id"
                        element={<PatientDetails showAlert={showAlert} />}
                    />
                    <Route
                        path="/login"
                        element={<Login showAlert={showAlert} />}
                    />
                    <Route
                        path="/signup"
                        element={<Signup showAlert={showAlert} />}
                    />
                    <Route path="/profile" element={<DoctorProfile />} />
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;

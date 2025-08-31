import { Link ,useNavigate } from "react-router-dom";

export default function Navbar(props) {
  var navigate=useNavigate();
  const handlelogout=()=>{
    localStorage.removeItem('token');
    navigate("/");
    props.showAlert("Logged out Successfully","success")
  }
  return (
    <>
      <nav className="navbar navbar-expand-lg bg-body-tertiary">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            GMSC
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div
            className="collapse navbar-collapse"
            id="navbarSupportedContent"
          >
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link
                  className="nav-link active"
                  aria-current="page"
                  to="/"
                >
                  Home
                </Link>
              </li>
            </ul>
            {
              localStorage.getItem('token')!=null
              ?
              <>
              <div className="d-flex align-items-center gap-2">
                  <span className="text-dark fw-semibold">
                      👤 {localStorage.getItem('name')}
                  </span>
                  <button className="btn btn-primary btn-outline-light rounded-pill px-3" onClick={handlelogout}>
                      Logout
                  </button>
              </div>
              </>
              :
                <form className="d-flex" role="search">
              <Link className="btn btn-primary mx-2" to="/login" role="button">Login</Link>
              <Link className="btn btn-primary mx-2" to="/signup" role="button">Sign Up</Link>
            </form>
              }
            
          </div>
        </div>
      </nav>
    </>
  );
}

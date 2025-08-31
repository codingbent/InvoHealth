export default function Alert (props) {
  const {alert}=props;
  return(
    <div style={{ height: "50px" }}>
            {alert && (
                <div className={`alert alert-${alert.type}`} role="alert">
                    {alert.msg}
                </div>
            )}
        </div>
  )
}

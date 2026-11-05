import { Routes, Route, Outlet } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import FindRides from "./pages/FindRides";
import  RideDetails from "./pages/RideDetails";
import CreateRide from "./pages/CreateRide";
import MyRides from "./pages/MyRides";
import RideRequests from "./pages/RideRequests";
import MyRequests from "./pages/MyRequests";
import Notifications from "./pages/Notifications";
import EditRide from "./pages/EditRide";
import Profile from "./pages/Profile";
function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}





function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<MainLayout />}>
      
      <Route path="/rides" element={<FindRides />} />
      <Route path="/rides/:id" element={<RideDetails />} />
      
        <Route path="/" element={<Home />} />

        <Route element={<ProtectedRoute />}>
        <Route path="/users/:userId" element={<Profile/>}/>
        <Route path="/rides/:id/edit" element={<EditRide />} />
        <Route path="/notifications" element={<Notifications/>}/>
        <Route path="/requests/my" element={<MyRequests />} />
        <Route
  path="/rides/:rideId/requests"
  element={<RideRequests />}
/>
        <Route path="/rides/my" element={<MyRides />} />
          <Route path="/rides/create" element={<CreateRide />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
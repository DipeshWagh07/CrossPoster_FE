// import React, { useState } from 'react';
// import axios from 'axios';
// import './styles.css'; // Import the CSS file
// function SignupForm({ onSignup, onSwitchToLogin }) {
//     const [name, setName] = useState('');
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
  
//     const handleSubmit = async (e) => {
//       e.preventDefault();
//       try {
//         const res = await axios.post('http://localhost:8000/api/auth/signup', { name, email, password });
//         localStorage.setItem('token', res.data.token);
//         onSignup(res.data.user);
//       } catch (err) {
//         alert('Signup failed');
//       }
//     };
  
//     return (
//       <div className="form-container">
//         <h2 className="form-title">Sign Up</h2>
//         <form onSubmit={handleSubmit}>
//           <input
//             type="text"
//             placeholder="Name"
//             className="input-field"
//             onChange={(e) => setName(e.target.value)}
//             required
//           />
//           <input
//             type="email"
//             placeholder="Email"
//             className="input-field"
//             onChange={(e) => setEmail(e.target.value)}
//             required
//           />
//           <input
//             type="password"
//             placeholder="Password"
//             className="input-field"
//             onChange={(e) => setPassword(e.target.value)}
//             required
//           />
//           <button type="submit" className="submit-btn">
//             Sign Up
//           </button>
//         </form>
//       </div>
//     );
// }
// export default SignupForm;
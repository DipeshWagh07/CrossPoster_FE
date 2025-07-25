// import React, { useState } from 'react';
// import axios from 'axios';
// import './styles.css';

// function LoginForm({ onLogin }) {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
  
//     const handleSubmit = async (e) => {
//       e.preventDefault();
//       try {
//         const res = await axios.post('${process.env.REACT_APP_BACKEND_URL}/api/auth/login', { email, password });
//         localStorage.setItem('token', res.data.token);
//         onLogin(res.data.user);
//       } catch (err) {
//         const errorMessage = err.response?.data?.message || 'Login failed';
//         alert(errorMessage);
//       }
//     };
  
//     return (
//       <div className="form-container">
//         <h2 className="form-title">Login</h2>
//         <form onSubmit={handleSubmit}>
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
//             Login
//           </button>
//         </form>
//       </div>
//     );
// }

// export default LoginForm;
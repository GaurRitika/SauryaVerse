// import React from 'react';
// import './App.css';
// import PaymentForm from './components/PaymentForm';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <h1>My Payment App</h1>
//       </header>
//       <main>
//         <PaymentForm />
//       </main>
//     </div>
//   );
// }

// export default App;


import React, { useState } from 'react';
import './App.css';
import PaymentForm from './components/PaymentForm';
import VideoCall from './components/VideoCall';

function App() {
  const [showVideoCall, setShowVideoCall] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <h1>My Payment App</h1>
      </header>
      <main>
        <PaymentForm />
        <button onClick={() => setShowVideoCall(!showVideoCall)}>
          {showVideoCall ? 'Hide Video Call' : 'Show Video Call'}
        </button>
        {showVideoCall && <VideoCall />}
      </main>
    </div>
  );
}

export default App;

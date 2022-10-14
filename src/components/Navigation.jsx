import { Link } from 'react-router-dom';
import { useLocation } from "react-router-dom";


export const Navigation = () => {
  const location = useLocation();

  let appIcon = <svg role="img" xmlns="http://www.w3.org/2000/svg" width="56px" height="56px" viewBox="0 0 24 24" aria-labelledby="shuffleIconTitle" stroke="#ffffff" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" fill="none" color="#ffffff"> <title id="shuffleIconTitle">Shuffle</title> <path d="M21 16.0399H17.7707C15.8164 16.0399 13.9845 14.9697 12.8611 13.1716L10.7973 9.86831C9.67384 8.07022 7.84196 7 5.88762 7L3 7"/> <path d="M21 7H17.7707C15.8164 7 13.9845 8.18388 12.8611 10.1729L10.7973 13.8271C9.67384 15.8161 7.84196 17 5.88762 17L3 17"/> <path d="M19 4L22 7L19 10"/> <path d="M19 13L22 16L19 19"/> </svg>

  let isHome = false;
  let isAddPair = false;
  let isMy = false;
  let isAbout = false;

  let homeIcon = <svg xmlns="http://www.w3.org/2000/svg" fill='none' viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>;

  let addPairIcon = <svg role="img" xmlns="http://www.w3.org/2000/svg" width="48px" height="48px" viewBox="0 0 24 24" aria-labelledby="addIconTitle" stroke="#ffffff" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" fill="none" color="#ffffff"> <title id="addIconTitle">Add</title> <path d="M17 12L7 12M12 17L12 7"/> <circle cx="12" cy="12" r="10"/> </svg>

  let myIcon = <svg role="img" xmlns="http://www.w3.org/2000/svg" width="48px" height="48px" viewBox="0 0 24 24" aria-labelledby="userIconTitle" stroke="#ffffff" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" fill="none" color="#ffffff"> <title id="userIconTitle">User</title> <path stroke-linecap="round" d="M5.5,19.5 C7.83333333,18.5 9.33333333,17.6666667 10,17 C11,16 8,16 8,11 C8,7.66666667 9.33333333,6 12,6 C14.6666667,6 16,7.66666667 16,11 C16,16 13,16 14,17 C14.6666667,17.6666667 16.1666667,18.5 18.5,19.5"/> <circle cx="12" cy="12" r="10"/> </svg>

  let aboutIcon = <svg role="img" xmlns="http://www.w3.org/2000/svg" width="48px" height="48px" viewBox="0 0 24 24" aria-labelledby="helpIconTitle" stroke="#FFFFFF" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" fill="none" color="#FFFFFF"> <title id="helpIconTitle">Help</title> <path d="M12 14C12 12 13.576002 11.6652983 14.1186858 11.1239516 14.663127 10.5808518 15 9.82976635 15 9 15 7.34314575 13.6568542 6 12 6 11.1040834 6 10.2998929 6.39272604 9.75018919 7.01541737 9.49601109 7.30334431 9.29624369 7.64043912 9.16697781 8.01061095"/> <line x1="12" y1="17" x2="12" y2="17"/> <circle cx="12" cy="12" r="10"/> </svg>

  switch (location.pathname) {
    case '/':
      isHome = true;
      break;
    case '/addPair':
      isAddPair = true;
      break;
    case '/my':
      isMy = true;
      break;
    case '/about':
      isAbout = true;
      break;
    default:
      break;
  }

  return (
    <nav>
      <div className="navHeader">
        {appIcon}
        <div className="navLabel" style={{lineHeight: 2.2}}></div>
      </div>
      <Link to="/">
        {homeIcon}
        <div className="navLabel" style={{ fontWeight: isHome ? 700 : 400 }}>Home</div>
      </Link>
      <Link to="/addPair">
        {addPairIcon}
        <div className="navLabel" style={{ fontWeight: isAddPair ? 700 : 400 }}>Add Pair</div>
      </Link>
      <Link to="/my">
        {myIcon}
        <div className="navLabel" style={{ fontWeight: isMy ? 700 : 400 }}>My</div>
      </Link>
      <Link to="/about">
        {aboutIcon}
        <div className="navLabel" style={{ fontWeight: isAbout ? 700 : 400 }}>About</div>
      </Link>
    </nav>
  );
};

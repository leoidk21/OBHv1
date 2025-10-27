export default function TestPage() {
  return (
    <div className="invitation-container">
      <div className="invitation-content">
        <h1>YOU ARE INVITED</h1>
        <p className="invitation-title">THE WEDDING OF</p>
        <div className="line"></div>

        <h2 className="couple-names">
          Leo & Chavez
        </h2>
        
        <p className="invitation-date">
          Saturday, November 5, 2025
        </p>

        <p className="invitation-message">
          Kindly confirm your attendance to reserve your seat.
        </p>

        <div className="button-container">
          <button className="btn going">Going</button>
          <button className="btn decline">Decline</button>
        </div>
      </div>

      <style jsx>{`
        @font-face {
            font-family: 'sarasvati';
            src: url('/fonts/Sarasvati.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }

        @font-face {
            font-family: 'newIconScript';
            src: url('/fonts/NewIconScript.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }

        @font-face {
            font-family: 'footlight';
            src: url('/fonts/FootlightMTProLight.otf') format('opentype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }

        @font-face {
            font-family: 'centuryGothic';
            src: url('/fonts/centurygothic.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }

        * {
          padding: 0;
          margin: 0;
        }

        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(#FFF4F0, #FDF6ED, #FFF4F0);
        }

        p, h1, h2, h3, h4, h5, h6 {
          text-wrap: balance;
          margin: 0;
          padding: 0;
          overflow-wrap: break-word;
        }

        .invitation-container {
          margin: 0;
          padding: 0;
          height: 100vh;
          display: flex;
          overflow: hidden;
          position: relative;
          align-items: center;
          flex-direction: row;  
          justify-content: center;
           background: linear-gradient(#FFF4F0, #FDF6ED, #FFF4F0);
        }

        .invitation-container::before {
          z-index: 0;
          top: -50px;
          content: "";
          width: 600px;
          opacity: 0.4;
          left: -200px;
          height: 600px;
          border-radius: 50%;
          position: absolute;
          background: #FEF3E2;
        }

        .invitation-container::after {
          z-index: 0;
          bottom: -50px;
          content: "";
          width: 600px;
          opacity: 0.4;
          right: -200px;
          height: 600px;
          border-radius: 50%;
          position: absolute;
          background: #FEF3E2;
        }

        .invitation-content {
          text-align: center;
          z-index: 1;
          position: relative;
        }

        .invitation-content h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          font-weight: normal;
        }

        .invitation-title {
          font-size: 1.3rem;
          margin-bottom: 1rem;
          font-weight: normal;
          letter-spacing: 0.1rem;
        }

        .line {
          height: 2px;
          width: 100px;
          margin: -3px auto;
          margin-bottom: 1rem;
          background-color: #B47D4C;
        }

        .couple-names {
          font-size: 5rem;
          color: #B47D4C;
          padding-top: 1rem;
          margin-bottom: 0.5rem;
          font-weight: normal;
          font-family: 'newIconScript', cursive;
        }

        .invitation-date {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          font-weight: normal;
        }

        .invitation-message {
          margin-bottom: 1rem;
          font-weight: normal;
        }

        .button-container {
          gap: 15px;
          display: flex;
          margin-top: 20px;
          align-items: center;
          justify-content: center;
        }

        .btn {
          gap: 8px;
          border: none;
          width: 150px;
          display: flex;
          cursor: pointer;
          font-weight: 500;
          padding: 12px 18px;
          font-size: 0.95rem;
          border-radius: 5px;
          align-items: center;
          text-decoration: none;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .btn.going {
          color: #fff;
          box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;
          background: linear-gradient(135deg, #DA9D61, #F9DCA4);
        }

        .btn.decline {
          box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;
          background: linear-gradient(180deg, #FEF3E2, #F9DCA4);
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
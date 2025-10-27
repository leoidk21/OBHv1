import { useState, useEffect } from 'react'
import { useRouter } from 'next/router' 

const API_BASE = 'https://ela-untraceable-foresakenly.ngrok-free.dev';

export default function InvitationPage() {
  const router = useRouter()
  const { eventId, guestId, token } = router.query
  const [guestData, setGuestData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (eventId && guestId && token) {
      loadInvitation()
    }
  }, [eventId, guestId, token])

  const loadInvitation = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/event-plans/invitation/${eventId}/${guestId}/${token}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const data = await response.json();

      if (data.success) {
        setGuestData(data.guest);
      } else {
        setMessage(data.error || 'Invalid invitation link');
      }
    } catch (error) {
      console.error('Error loading invitation:', error);
      setMessage('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  }

  const respondToInvitation = async (status) => {
    if (!guestData) return
    
    setResponding(true)
    try {
      const response = await fetch(`${API_BASE}/api/event-plans/invitation/${eventId}/${guestId}/${token}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setGuestData(prev => ({ ...prev, status }));
      } else {
        setMessage(data.error || 'Failed to send response');
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      setMessage('Failed to send response');
    } finally {
      setResponding(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading your invitation...</div>
      </div>
    )
  }

  if (!guestData && message) {
    return (
      <div className="container">
        <div className="error-message">{message}</div>
      </div>
    )
  }

  if (!guestData) {
    return (
      <div className="container">
        <div className="error-message">Invalid invitation link</div>
      </div>
    )
  }

  const event = guestData.event || {};
  const displayNames = event.client_name || 'The Couple';

  return (
    <div className="invitation-container">
      <div className="invitation-content">
        {message && (
          <div className={`message ${guestData.status ? 'success' : 'info'}`}>
            {message}
          </div>
        )}

        <h1>YOU ARE INVITED</h1>
        <p className="invitation-title">THE WEDDING OF</p>
        <div className="line"></div>

        <h2 className="couple-names">
          {displayNames}
        </h2>
        
        <p className="invitation-date">
          {new Date(event.event_date).toLocaleDateString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>

        <p className="invitation-message">
          Kindly confirm your attendance to reserve your seat.
        </p>

        {!guestData.status || guestData.status === 'Pending' ? (
          <div className="button-container">
            <button 
              className="btn going" 
              onClick={() => respondToInvitation('Accepted')}
              disabled={responding}
            >
              {responding ? 'Sending...' : 'Going'}
            </button>
            <button 
              className="btn decline" 
              onClick={() => respondToInvitation('Declined')}
              disabled={responding}
            >
              {responding ? 'Sending...' : 'Decline'}
            </button>
          </div>
        ) : (
          <div className="already-responded">
            You have already {guestData.status.toLowerCase()} this invitation.
          </div>
        )}
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
          src: url('/fonts/New Icon Script.ttf') format('truetype');  // FIXED
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
          font-family: 'sarasvati';
        }

        .invitation-title {
          font-size: 1.3rem;
          margin-bottom: 1rem;
          font-weight: normal;
          letter-spacing: 0.1rem;
          font-family: 'sarasvati';
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
          font-family: 'newIconScript';
        }

        .invitation-date {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          font-weight: normal;
          font-family: 'footlight';
        }

        .invitation-message {
          margin-bottom: 1rem;
          font-weight: normal;
          font-family: 'centuryGothic';
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
          font-family: 'centuryGothic';
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

        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 10px;
          font-weight: bold;
          font-family: 'centuryGothic';
        }

        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.info {
          background-color: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }

        .already-responded {
          padding: 20px;
          background: #e7f3ff;
          color: #0066cc;
          border-radius: 10px;
          font-weight: bold;
          font-family: 'centuryGothic';
        }

        .loading, .error-message {
          background: white;
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          font-size: 1.2em;
          font-family: 'centuryGothic';
        }

        .error-message {
          color: #f44336;
        }
      `}</style>
    </div>
  )
}
import { useState, useEffect } from 'react';
import { Guest, CurrentGuest, StatusType } from '../../type';

export const useGuestManagement = () => {
  const [currentGuest, setCurrentGuest] = useState<CurrentGuest>({
    name: '',
    status: '',
    side: '', // Keep but don't use
  });

  const resetCurrentGuest = () => {
    setCurrentGuest({
      name: '',
      status: '',
      side: '',
    });
  };

  const [invitedGuests, setInvitedGuests] = useState<Guest[]>([]);

  // Save RSVP status
  const saveRSVPStatus = (rsvpIndex: number) => {
    // If no selection (-1), default to "Pending" (index 2)
    const finalIndex = rsvpIndex === -1 ? 2 : rsvpIndex;
    const status = ["Accepted", "Decline", "Pending"][finalIndex];
    
    setCurrentGuest(prev => ({
      ...prev,
      status: status
    }));
  };

  // Add guest to the list
  const addGuest = () => {
    if (currentGuest.name.trim()) {
      const newGuest: Guest = {
        id: Date.now().toString(),
        name: currentGuest.name,
        status: currentGuest.status || 'Pending',
        inviteLink: '',
      };
      
      setInvitedGuests(prevGuests => [...prevGuests, newGuest]);
      
      // Reset current guest
      setCurrentGuest({
        name: '',
        status: 'Pending',
        side: '',
      });
      
      return newGuest;
    }
    return null;
  };

  // Update guest name
  const updateGuestName = (name: string) => {
    setCurrentGuest(prev => ({ ...prev, name }));
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      Accepted: '#4CAF50',
      Declined: '#F44336',
      Pending: '#FF9800',
    };
    return statusColors[status] || '#666';
  };

  // search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);

  // Filter guests based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredGuests(invitedGuests);
    } else {
      const filtered = invitedGuests.filter(guest =>
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGuests(filtered);
    }
  }, [searchQuery, invitedGuests]);

  return {
    currentGuest,
    invitedGuests,
    saveRSVPStatus,
    addGuest,
    updateGuestName,
    getStatusColor,
    resetCurrentGuest,
  };
};
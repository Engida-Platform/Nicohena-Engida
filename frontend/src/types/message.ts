export interface MessageCounterparty {
  id: string;
  name: string;
  email: string;
  role: 'HOST' | 'GUEST';
}

export interface ConversationProperty {
  id: string;
  title: string;
  city: string;
  coverImage: string | null;
  pricePerNight: number;
}

export interface ConversationBooking {
  id: string;
  reference: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface ConversationSummary {
  id: string;
  propertyId: string;
  bookingId: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount: number;
  counterparty: MessageCounterparty;
  property: ConversationProperty | null;
  booking: ConversationBooking | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
  };
}

export interface ConversationThread {
  conversation: ConversationSummary;
  messages: ChatMessage[];
}

export interface SendMessagePayload {
  conversationId?: string;
  propertyId?: string;
  bookingId?: string;
  receiverId?: string;
  content: string;
}


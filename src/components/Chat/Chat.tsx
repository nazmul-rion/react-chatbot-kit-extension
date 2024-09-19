import React, { useState, useRef, useEffect, SetStateAction } from 'react';
import ConditionallyRender from 'react-conditionally-render';

import UserChatMessage from '../UserChatMessage/UserChatMessage';
import ChatbotMessage from '../ChatbotMessage/ChatbotMessage';

import {
  botMessage,
  userMessage,
  customMessage,
  createChatMessage,
} from './chatUtils';

import ChatIcon from '../../assets/icons/paper-plane.svg';
import MicIcon from '../../assets/icons/mic.svg';

import './Chat.css';
import {
  ICustomComponents,
  ICustomMessage,
  ICustomStyles,
} from '../../interfaces/IConfig';
import { IMessage } from '../../interfaces/IMessages';
import { string } from 'prop-types';

interface IChatProps {
  setState: React.Dispatch<SetStateAction<any>>;
  widgetRegistry: any;
  messageParser: any;
  actionProvider: any;
  customComponents: ICustomComponents;
  botName: string;
  customStyles: ICustomStyles;
  headerText: string;
  customMessages: ICustomMessage;
  placeholderText: string;
  validator: (input: string) => Boolean;
  state: any;
  disableScrollToBottom: boolean;
  messageHistory: IMessage[] | string;
  parse?: (message: string, image: any) => void;
  actions?: object;
  messageContainerRef: React.MutableRefObject<HTMLDivElement>;
}



const Chat = ({
  state,
  setState,
  widgetRegistry,
  messageParser,
  parse,
  customComponents,
  actionProvider,
  botName,
  customStyles,
  headerText,
  customMessages,
  placeholderText,
  validator,
  disableScrollToBottom,
  messageHistory,
  actions,
  messageContainerRef,
}: IChatProps) => {
  const { messages } = state;

  const [input, setInputValue] = useState('');
  const [imageFile, setImageFile] = useState<any>(null)
  const scrollIntoView = () => {
    setTimeout(() => {
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop =
          messageContainerRef?.current?.scrollHeight;
      }
    }, 50);
  };

  useEffect(() => {
    if (disableScrollToBottom) return;
    scrollIntoView();
  });

  const showAvatar = (messages: any[], index: number) => {
    if (index === 0) return true;

    const lastMessage = messages[index - 1];

    if (lastMessage.type === 'bot' && !lastMessage.widget) {
      return false;
    }
    return true;
  };

  const renderMessages = () => {
    return messages.map((messageObject: IMessage, index: number) => {
      if (botMessage(messageObject)) {
        return (
          <React.Fragment key={messageObject.id}>
            {renderChatbotMessage(messageObject, index)}
          </React.Fragment>
        );
      }

      if (userMessage(messageObject)) {
        return (
          <React.Fragment key={messageObject.id}>
            {renderUserMessage(messageObject)}
          </React.Fragment>
        );
      }

      if (customMessage(messageObject, customMessages)) {
        return (
          <React.Fragment key={messageObject.id}>
            {renderCustomMessage(messageObject)}
          </React.Fragment>
        );
      }
    });
  };

  const renderCustomMessage = (messageObject: IMessage) => {
    const customMessage = customMessages[messageObject.type];

    const props = {
      setState,
      state,
      scrollIntoView,
      actionProvider,
      payload: messageObject.payload,
      actions,
    };

    if (messageObject.widget) {
      const widget = widgetRegistry.getWidget(messageObject.widget, {
        ...state,
        scrollIntoView,
        payload: messageObject.payload,
        actions,
      });
      return (
        <>
          {customMessage(props)}
          {widget ? widget : null}
        </>
      );
    }

    return customMessage(props);
  };

  const renderUserMessage = (messageObject: IMessage) => {
    const widget = widgetRegistry.getWidget(messageObject.widget, {
      ...state,
      scrollIntoView,
      payload: messageObject.payload,
      actions,
    });
    return (
      <>
        <UserChatMessage
          message={messageObject.message}
          key={messageObject.id}
          customComponents={customComponents}
        />
        {widget ? widget : null}
      </>
    );
  };

  const renderChatbotMessage = (messageObject: IMessage, index: number) => {
    let withAvatar;
    if (messageObject.withAvatar) {
      withAvatar = messageObject.withAvatar;
    } else {
      withAvatar = showAvatar(messages, index);
    }

    const chatbotMessageProps = {
      ...messageObject,
      setState,
      state,
      customComponents,
      widgetRegistry,
      messages,
      actions,
    };

    if (messageObject.widget) {
      const widget = widgetRegistry.getWidget(chatbotMessageProps.widget, {
        ...state,
        scrollIntoView,
        payload: messageObject.payload,
        actions,
      });
      return (
        <>
          <ChatbotMessage
            customStyles={customStyles.botMessageBox}
            withAvatar={withAvatar}
            {...chatbotMessageProps}
            key={messageObject.id}
          />
          <ConditionallyRender
            condition={!chatbotMessageProps.loading}
            show={widget ? widget : null}
          />
        </>
      );
    }

    return (
      <ChatbotMessage
        customStyles={customStyles.botMessageBox}
        key={messageObject.id}
        withAvatar={withAvatar}
        {...chatbotMessageProps}
        customComponents={customComponents}
        messages={messages}
        setState={setState}
      />
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validator && typeof validator === 'function') {
      if (validator(input)) {
        handleValidMessage();
        if (parse) {
          return parse(input, imageFile);
        }
        messageParser.parse(input, imageFile);
      }
    } else {
      handleValidMessage();
      if (parse) {
        return parse(input, imageFile);
      }
      messageParser.parse(input, imageFile);
    }
  };

  const handleValidMessage = () => {
    setState((state: any) => ({
      ...state,
      messages: [...state.messages, createChatMessage(input, 'user')],
    }));

    scrollIntoView();
    setInputValue('');
  };

  const customButtonStyle = { backgroundColor: '' };
  if (customStyles && customStyles.chatButton) {
    customButtonStyle.backgroundColor = customStyles.chatButton.backgroundColor;
  }

  let header = `Conversation with ${botName}`;
  if (headerText) {
    header = headerText;
  }

  let placeholder = 'Write your message here';
  if (placeholderText) {
    placeholder = placeholderText;
  }
  const [isImageSelectButtonVisible, setIsImageSelectButtonVisible] = useState(false);

  const handleFileChange = (event: any) => {
    event.stopPropagation()
    const file = event.target.files[0];
    if (file) {
      console.log('Selected file:', file);
      setImageFile(file)
    }
  };
  const handleButtonClick = (e: any) => {
    e.stopPropagation()
    document.getElementById('imageInput').click();
  };

  const checkAppSetting = () => {
    const storedValue = localStorage.getItem('app-setting');
    if (storedValue) {
      const appSetting = JSON.parse(storedValue);
      if (appSetting.url === 'http://localhost:8092/v1/gpt/ask/vision') {
        setIsImageSelectButtonVisible(true);
      } else {
        setIsImageSelectButtonVisible(false); // Hide button if the condition is not met
      }
    }
  };
  useEffect(() => {
    checkAppSetting();
    window.addEventListener('storage', checkAppSetting);
    return () => {
      window.removeEventListener('storage', checkAppSetting);
    };
  }, []);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      }
    }
  }, []);
  const handleMicClick = () => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    try {
      // Get the SpeechRecognition object from the window (with webkit fallback)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition is not supported by this browser.');
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      if (!isListening) {
        setIsListening(true);
        recognition.start();
      }

      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        setInputValue(speechResult)
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Error occurred in recognition:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

    } catch (error) {
      console.error('Speech recognition error:', error);
    }
  };
  return (
    <div className="react-chatbot-kit-chat-container">
      <div className="react-chatbot-kit-chat-inner-container">
        <ConditionallyRender
          condition={!!customComponents.header}
          show={
            customComponents.header && customComponents.header(actionProvider)
          }
          elseShow={
            <div className="react-chatbot-kit-chat-header">{header}</div>
          }
        />

        <div
          className="react-chatbot-kit-chat-message-container"
          ref={messageContainerRef}
        >
          <ConditionallyRender
            condition={
              typeof messageHistory === 'string' && Boolean(messageHistory)
            }
            show={
              <div
                dangerouslySetInnerHTML={{ __html: messageHistory as string }}
              />
            }
          />

          {renderMessages()}
          <div style={{ paddingBottom: '15px' }} />
        </div>

        <div className="react-chatbot-kit-chat-input-container">
          <div
            className="react-chatbot-kit-chat-input-form"
            
          >
            <MicIcon className="react-chatbot-kit-mic-icon" onClick={handleMicClick}/>
            <input
              className="react-chatbot-kit-chat-input"
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <>
            
            {isImageSelectButtonVisible && <button
              className="react-chatbot-kit-select-image"
              onClick={handleButtonClick}
            >
              {imageFile && imageFile.name.slice(20) || "Select Image" }
            </button>}
            <input
              type="file"
              id="imageInput"
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />
            </>
            <button
              className="react-chatbot-kit-chat-btn-send"
              style={customButtonStyle}
              onClick={handleSubmit}
            >
              <ChatIcon className="react-chatbot-kit-chat-btn-send-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

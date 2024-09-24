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
import FileIcon from '../../assets/icons/file.svg';

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
  parse?: (message: string, image?: any, audioFile?: any) => void;
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
  const [selectedAudioFile, setSelectedAudioFile] = useState<any>(null)
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
            {renderUserMessage({...messageObject, image: state.image, audioFile: state.audioFile})}
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
          image={messageObject.image}
          audioFile={messageObject.audioFile}
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
          return parse(input, imageFile, selectedAudioFile);
        }
        messageParser.parse(input, imageFile, selectedAudioFile);
      }
    } else {
      handleValidMessage();
      if (parse) {
        return parse(input, imageFile, selectedAudioFile);
      }
      messageParser.parse(input, imageFile, selectedAudioFile);
    }
  };

  const handleValidMessage = () => {
    setState((state: any) => ({
      ...state,
      messages: [...state.messages, createChatMessage(input, 'user')],
    }));

    scrollIntoView();
    setInputValue('');
    setImageFile(null)
    setSelectedAudioFile(null)
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
        setSelectedAudioFile(null)
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
  const [chatBtnDisabled, setChatBtnDisabled] = useState(false)
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
  const isChatBtnDisabled = ()=> {
    if(isImageSelectButtonVisible){
        if(!imageFile || input.length < 1)
          return true
        else
          return false
    }
    else if (input.length < 1)
        return true
    return false
  }

  useEffect(()=> {
    const disabled = isChatBtnDisabled()
    setChatBtnDisabled(disabled)
  }, [isImageSelectButtonVisible, imageFile, input])
  
  const handleAudioFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedAudioFile(file);
    }
  };
  const handleAudioButtonClick = () => {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
  };
  const [listeningTxt, setListeningTxt] = useState("Listening ...")

  useEffect(() => {
    let intervalId: any;
  
    if (isListening) {
      intervalId = setInterval(() => {
        setListeningTxt(prev => prev === "Listening ..." ? "Listening .." : "Listening ...");
      }, 400); // Increased the interval to avoid excessive updates
    } 
  
    return () => {
      clearInterval(intervalId); // Ensure interval is cleared when `isListening` becomes false or component unmounts
    };
  }, [isListening]);

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
            
              <>
                {!isListening && <MicIcon className="react-chatbot-kit-mic-icon" onClick={handleMicClick}/>}
                {isListening && <p style={{width: "120px", marginLeft: "10px"}}>{listeningTxt}</p>}
              </>
            
            {
            !isImageSelectButtonVisible && 
            <FileIcon className="react-chatbot-kit-file-icon" onClick={handleAudioButtonClick}/>
            }
            <input
              type="file"
              id="fileInput"
              style={{ display: 'none' }}
              accept=".mp3, .mp4, .mpeg, .mpga, .m4a, .wav, .webm, .x-m4a"
              onChange={handleAudioFileChange}
            />
            <span>{selectedAudioFile && `${selectedAudioFile.name.slice(0,20)}.${selectedAudioFile.name.split('.').pop()}`}</span>
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
              {(imageFile && `${imageFile.name.slice(0,20)}.${imageFile.name.split('.').pop()}`) || "Select Image" }
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
              style={{...customButtonStyle, backgroundColor: chatBtnDisabled ? "grey" : "rgb(0, 74, 173)", height: "100%" }}
              onClick={handleSubmit}
              disabled={chatBtnDisabled}
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

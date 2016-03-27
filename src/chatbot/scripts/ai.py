#!/usr/bin/env python

import chatbot
import aiml
import rospy
import os
import logging
import requests
import json

from polarity import Polarity
from chatbot.msg import ChatMessage
from std_msgs.msg import String
from dynamic_reconfigure.server import Server
from chatbot.cfg import ChatbotConfig

logger = logging.getLogger('hr.chatbot.ai')

class Chatbot():
  def __init__(self):
    self.chatbot_url = 'http://localhost:8001'

    # chatbot now saves a bit of simple state to handle sentiment analysis
    # after formulating a response it saves it in a buffer if S.A. active
    # It has a simple state transition - initialized in wait_client
    # after getting client if S.A. active go to wait_emo
    #  in affect_express call back publish response and reset to wait_client
    self._response_buffer = ''
    self._state = 'wait_client'
    # argumment must be  to activate sentiment analysis
    self.botid = ''
    self._sentiment_active = False
    # sentiment dictionary
    self.polarity = Polarity()
    self._polarity_threshold=0.2

    rospy.Subscriber('chatbot_speech', ChatMessage, self._request_callback)

    self._response_publisher = rospy.Publisher(
        'chatbot_responses', String, queue_size=1)

    # send communication non-verbal blink message to behavior
    self._blink_publisher = rospy.Publisher(
        'chatbot_blink',String,queue_size=1)

    # Perceived emotional content; and emotion to express
    # Perceived: based on what chatbot heard, this is how robot should
    # feel.  Expressed: the emotional content that the chatbot should
    # put into what it says.
    self._affect_publisher = rospy.Publisher(
        'chatbot_affect_perceive', String, queue_size=1)

    # Echo chat messages as plain strings.
    self._echo_publisher = rospy.Publisher('perceived_text', String, queue_size=1)
    rospy.Subscriber('chatbot_speech', ChatMessage, self._echo_callback)

  def set_botid(self, botid):
    self.botid = botid

  def sentiment_active(self, active):
    self._sentiment_active = active

  def get_response(self, question):
      r = requests.post(self.chatbot_url,
            data = json.dumps(
                {"botid":"{}".format(self.botid),
                "question":"{}".format(question),
                "session":"0"}),
            headers = {"Content-Type": "application/json",
                       "Auth": '+AuOkDL1Xb'}
      )
      ret = r.json().get('ret')
      if r.status_code != 200:
        logger.error("Request error: {}".format(r.status_code))

      if ret != 0:
        logger.error("QA error: error code {}, botid {}, question {}".format(
            ret, self.botid, question))

      response = r.json().get('response', {})

      if r.status_code != 200 or ret != 0 or not response:
        response['text'] = question
        response['botid'] = 'mimic_bot'

      return response

  def _request_callback(self, chat_message):
    if rospy.get_param('lang', None) != 'en':
        logger.info('Ignore non-English language')
        return
    response = ''

    blink=String()
    # blink that we heard something, request, probability defined in callback
    blink.data='chat_heard'
    self._blink_publisher.publish(blink)

    if chat_message.confidence < 50:
      response = 'Could you say that again?'
      message = String()
      message.data = response
      self._response_publisher.publish(message)
      # puzzled expression
    else:
      # request blink, probability of blink defined in callback
      blink.data='chat_saying'
      self._blink_publisher.publish(blink)

      answer = self.get_response(chat_message.utterance)
      response = answer.get('text')
      emotion = answer.get('emotion')
      botid = answer.get('botid')

      # Add space after punctuation for multi-sentence responses
      response = response.replace('?','? ')
      response = response.replace('.','. ')
      response = response.replace('_',' ')

      # if sentiment active save state and wait for affect_express to publish response
      # otherwise publish and let tts handle it
      if self._sentiment_active:
        emo = String()
        if emotion:
          emo.data = emotion
          self._affect_publisher.publish(emo)
          logger.info('Chatbot perceived emo: {}'.format(emo.data))
        else:
          p = self.polarity.get_polarity(response)
          logger.info('Polarity for "{}" is {}'.format(response, p))
          # change emotion if polarity magnitude exceeds threshold defined in constructor
          # otherwise let top level behaviors control
          if p > self._polarity_threshold:
            emo.data = 'happy'
            self._affect_publisher.publish(emo)
            logger.info('Chatbot perceived emo: {}'.format(emo.data))
            # Currently response is independant of message received so no need to wait
            # Leave it for Opencog to handle responses later on.
          elif p < 0 and abs(p)> self._polarity_threshold:
            emo.data = 'frustrated'
            self._affect_publisher.publish(emo)
            logger.info('Chatbot perceived emo: {}'.format(emo.data))
            # Currently response is independant of message received so no need to wait
            # Leave it for Opencog to handle responses later on.

      self._response_publisher.publish(String(response))
      logger.info("Ask: {}, answer: {}, answered by: {}".format(
          chat_message.utterance, response, botid))

  # Just repeat the chat message, as a plain string.
  def _echo_callback(self, chat_message):
    message = String()
    message.data = chat_message.utterance
    self._echo_publisher.publish(message)

  def reconfig(self, config, level):
    self.set_botid(config.botid)
    self.sentiment_active(config.sentiment)
    return config

if __name__ == '__main__':
  rospy.init_node('chatbot_en')
  bot = Chatbot()
  current = os.path.dirname(os.path.realpath(__file__))
  sent3_file = os.path.join(current, "../aiml/senticnet3.props.csv")
  bot.polarity.load_sentiment_csv(sent3_file)
  Server(ChatbotConfig, bot.reconfig)
  rospy.spin()

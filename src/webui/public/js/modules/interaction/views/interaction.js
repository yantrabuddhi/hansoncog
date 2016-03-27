define(["application", './message', "tpl!./templates/interaction.tpl", 'lib/api'],
    function (App, MessageView, template, api) {
        var self;
        App.module("Interaction.Views", function (Views, App, Backbone, Marionette, $, _) {
            Views.Interaction = Marionette.CompositeView.extend({
                template: template,
                childView: MessageView,
                childViewContainer: '.app-messages',
                ui: {
                    messages: '.app-messages',
                    recordButton: '.app-record-button',
                    messageInput: '.app-message-input',
                    sendButton: '.app-send-button',
                    unsupported: '.app-unsupported',
                    supported: '.app-supported',
                    recordContainer: '.record-container',
                    faceThumbnails: '.app-face-thumbnails',
                    faceContainer: '.app-select-person-container',
                    faceCollapse: '.app-face-container',
                    footer: 'footer',
                    languageButton: '.app-language-select button',
                    recognitionMethodButton: '.app-recognition-select button',
                },
                events: {
                    'touchstart @ui.recordButton': 'toggleSpeech',
                    'touchend @ui.recordButton': 'toggleSpeech',
                    'click @ui.recordButton': 'toggleSpeech',
                    'keyup @ui.messageInput': 'messageKeyUp',
                    'click @ui.sendButton': 'sendClicked',
                    'click @ui.languageButton': 'languageButtonClick',
                },
                initialize: function () {
                    self = this;
                    api.enableInteractionMode();
                    api.topics.chat_responses.subscribe(this.responseCallback);
                    api.topics.speech_active.subscribe(this.speechActiveCallback);
                    api.topics.speech_topic.subscribe(this.voiceRecognised);
                },
                onDestroy: function () {
                    this.options.faceCollection.unsubscribe();
                    api.topics.chat_responses.unsubscribe(this.responseCallback);
                    api.topics.speech_active.unsubscribe(this.speechActiveCallback);
                    api.topics.speech_topic.unsubscribe(this.voiceRecognised);
                    this.disableSpeech();
                },
                updateFaces: function () {
                    var currentTime = new Date().getTime();

                    // remove lost faces older than 3 seconds
                    $('img', this.ui.faceThumbnails).each(function (i, img) {
                        var id = parseInt($(img).attr('title'));

                        if (!self.options.faceCollection.findWhere({id: id}) && (currentTime - $(img).data('time-added')) > 3000) {
                            $(img).remove();

                            if (self.options.faceCollection.getLookAtFaceId() == id)
                                self.ui.faceCollapse.collapse('show');
                        }
                    });

                    this.options.faceCollection.each(function (face) {
                        var img = $('img[title="' + face.get('id') + '"]', self.ui.faceThumbnails),
                        // update thumbnail every 3 seconds, update time added
                            thumbnailUrl = face.getThumbnailUrl() + '?' + parseInt(currentTime / 3000);

                        // if image already shown
                        if (img.length > 0) {
                            $(img).prop({
                                src: thumbnailUrl
                            }).data('time-added', currentTime);
                        } else {
                            // create new thumbnail
                            var setActiveThumbnail = function (el) {
                                    $('img', self.ui.faceThumbnails).removeClass('active');
                                    $(el).addClass('active');
                                },
                                el = $('<img>').prop({
                                    src: thumbnailUrl,
                                    title: face.get('id'),
                                    'class': 'face-thumbnail thumbnail',
                                    width: 100,
                                    height: 100
                                }).data('time-added', currentTime).click(function () {
                                    self.options.faceCollection.setLookAtFaceId(face.get('id'));
                                    setActiveThumbnail(this);
                                });

                            if (self.options.faceCollection.getLookAtFaceId() == face.get('id'))
                                setActiveThumbnail(el);

                            self.ui.faceThumbnails.append(el);
                        }
                    });

                    if ($('img', this.ui.faceThumbnails).length == 0 && this.options.faceCollection.isEmpty()) {
                        if (!this.facesEmpty) {
                            this.facesEmpty = true;
                            this.ui.faceContainer.slideUp();
                        }
                    } else if (typeof this.facesEmpty == 'undefined' || this.facesEmpty) {
                        this.facesEmpty = false;

                        this.ui.faceCollapse.removeClass('in');
                        this.ui.faceContainer.slideDown();
                    }
                },
                serializeData: function () {
                    return {
                        faces: this.options.faceCollection
                    };
                },
                onRender: function () {
                    this.options.faceCollection.on('change', this.updateFaces, this);
                    this.options.faceCollection.subscribe();
                    this.updateFaces();

                    // update chat margins on face collapse show/hide
                    this.ui.faceCollapse.on('shown.bs.collapse hidden.bs.collapse', function () {
                        self.ui.messages.css('margin-bottom', self.ui.footer.height());
                        self.scrollToChatBottom();
                    });

                    // set current language
                    api.getRobotLang(function (language) {
                        self.changeLanguage(language);
                    });

                    // set current speech recognition method
                    api.getRosParam('/' + api.config.robot + '/webui/speech_recognition', function (method) {
                        self.setRecognitionMethod(method);
                    });
                    this.speechStarted = 0;
                },
                responseCallback: function (msg) {
                    self.collection.add({author: 'Robot', message: msg.data});
                },
                speechActiveCallback: function (msg) {
                    if (self.speechEnabled) {
                        if (msg.data == 'start') {
                            self.speechPaused = true;
                            self.disableSpeech();
                        }
                    } else if ((msg.data != 'start') && self.speechPaused) {
                        self.enableSpeech()
                    }
                },
                onSpeechEnabled: function () {
                    self.speechEnabled = true;
                    self.ui.recordButton.removeClass('btn-info').addClass('btn-danger');
                },
                onSpeechDisabled: function () {
                    self.speechEnabled = false;
                    if (typeof self.ui.recordButton.removeClass == 'function')
                        self.ui.recordButton.removeClass('btn-danger').addClass('btn-info').blur();
                },
                toggleSpeech: function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    var currentTime = new Date().getTime(),
                        maxClickTime = 500;

                    if (e.type == 'touchstart') {
                        console.log('touch start');
                        self.touchstarted = currentTime;
                    }
                    if (e.type == 'touchend') {
                        console.log('touch end');
                        if (currentTime - maxClickTime < self.touchstarted) {
                            return;
                        }
                    }
                    if (this.speechEnabled) {
                        self.speechPaused = false;
                        this.disableSpeech(e);
                    } else {
                        this.enableSpeech(e);
                    }
                },
                messageKeyUp: function (e) {
                    if (e.keyCode == 13)
                        this.ui.sendButton.click();
                },
                sendClicked: function () {
                    var message = this.ui.messageInput.val();

                    if (message != '') api.sendChatMessage(message);

                    this.ui.messageInput.val('');
                },
                attachHtml: function (collectionView, childView) {
                    childView.$el.hide();
                    collectionView._insertAfter(childView);

                    $(childView.$el).fadeIn(400, function () {
                        self.scrollToChatBottom();
                    });
                },
                scrollToChatBottom: function () {
                    if (!self.scrolling)
                        $('html, body').animate({scrollTop: $(document).height()}, 'slow', 'swing', function () {
                            self.scrolling = false;
                        });
                    self.scrolling = true;
                },
                voiceRecognised: function (message) {
                    self.collection.add({author: 'Me', message: message.utterance});
                },
                enableSpeech: function () {
                    self.speech_recognition = 'webspeech';
                    self.enableWebspeech();
                },
                disableSpeech: function () {
                    this.disableWebspeech()
                },
                languageButtonClick: function (e) {
                    var language = $(e.target).data('lang');
                    this.changeLanguage(language);
                },
                language: 'en',
                changeLanguage: function (language) {
                    if (this.language == language) return;
                    this.disableSpeech();

                    this.changeMessageLanguage(language);
                    this.language = language;

                    this.ui.languageButton.removeClass('active');
                    $('[data-lang="' + language + '"]', this.el).addClass('active');

                    api.setRobotLang(this.language);
                },
                changeMessageLanguage: function (language) {
                    if (!self.messages) self.messages = {};

                    self.messages[self.language] = self.collection.clone();
                    self.collection.reset();

                    if (self.messages[language]) self.collection.add(self.messages[language].models);
                },
                enableWebspeech: function () {
                    if (!this.speechRecognition || !this.speechEnabled) {
                        if ('webkitSpeechRecognition' in window) {
                            this.speechRecognition = new webkitSpeechRecognition();
                        } else if ('SpeechRecognition' in window) {
                            this.speechRecognition = new SpeechRecognition();
                        } else {
                            console.log('webspeech api not supported');
                            this.speechRecognition = null;
                        }

                        this.speechRecognition.lang = this.language == 'zh' ? 'cmn-Hans-CN' : 'en-US';
                        this.speechRecognition.interimResults = false;
                        this.speechRecognition.continuous = false;

                        this.speechRecognition.onstart = function () {
                            console.log('starting webspeech');
                            api.topics.chat_events.publish(new ROSLIB.Message({data: 'start'}));
                            self.onSpeechEnabled();
                        };
                        this.speechRecognition.onspeechstart = function () {
                            api.topics.chat_events.publish(new ROSLIB.Message({data: 'speechstart'}));
                        };
                        this.speechRecognition.onspeechend = function () {
                            api.topics.chat_events.publish(new ROSLIB.Message({data: 'speechend'}));
                        };
                        this.speechRecognition.onresult = function (event) {
                            var mostConfidentResult = null;

                            _.each(event.results[event.results.length - 1], function (result) {
                                if ((!mostConfidentResult || mostConfidentResult.confidence <= result.confidence))
                                    mostConfidentResult = result;
                            });

                            if (mostConfidentResult)
                                api.sendChatMessage(mostConfidentResult.transcript);
                        };

                        this.speechRecognition.onerror = function (event) {
                            switch (event.error) {
                                case 'not-allowed':
                                case 'service-not-allowed':
                                    self.onSpeechDisabled();
                                    break;
                            }
                            console.log('error recognising speech');
                            console.log(event);

                        };
                        this.speechRecognition.onend = function () {
                            if (self.speechEnabled) {
                                var timeSinceLastStart = new Date().getTime() - self.speechStarted;
                                if (timeSinceLastStart < 1000) {
                                    setTimeout(function () {
                                        self.speechRecognition.start();
                                    }, 1000);
                                } else {
                                    self.speechRecognition.start();
                                }
                            } else {
                                console.log('end of speech');
                                api.topics.chat_events.publish(new ROSLIB.Message({data: 'end'}));
                            }
                        };
                        this.speechStarted = new Date().getTime();
                        this.speechRecognition.start();
                    }
                },
                disableWebspeech: function () {
                    if (this.speechRecognition) {
                        self.onSpeechDisabled();
                        this.speechRecognition.stop();
                        this.speechRecognition = null;
                    }
                },
                recognitionButtonClick: function (e) {
                    this.setRecognitionMethod($(e.target).data('method'));
                },
                setRecognitionMethod: function (method) {
                    // set default
                    if (!method) method = 'webspeech';
                    this.disableSpeech();

                    this.ui.recognitionMethodButton.removeClass('active');
                    $('[data-method="' + method + '"]', this.el).addClass('active');

                    // update param
                    api.setRosParam('/' + api.config.robot + '/webui/speech_recognition', method);
                },
            });
        });

        return App.module('Interaction.Views').Interaction;
    });

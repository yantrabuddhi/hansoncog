define(["application", "./emotion", 'tpl!./templates/emotions.tpl'],
    function (App, EmotionView, template) {
        App.module("Gestures.Views", function (Views, App, Backbone, Marionette, $, _) {
            Views.Emotions = Marionette.CompositeView.extend({
                childView: EmotionView,
                childViewContainer: '.app-emotions-container',
                template: template,
                ui: {
                    durationSlider: '.app-duration-slider',
                    durationValue: '.app-duration-value',
                    magnitudeSlider: '.app-magnitude-slider',
                    magnitudeValue: '.app-magnitude-value'
                },
                config: {
                    duration: {
                        default: 3,
                        current: 3,
                        min: 0,
                        max: 10
                    },
                    magnitude: {
                        default: 1,
                        current: 1,
                        min: 0,
                        max: 1
                    }
                },
                /**
                 * Pass data to child views
                 *
                 * @returns {{config: *}}
                 */
                childViewOptions: function () {
                    return {
                        config: this.config,
                        getSliderValues: function () {
                            return {
                                duration: this.config.duration.current.toFixed(2),
                                magnitude: this.config.magnitude.current.toFixed(2)
                            }
                        }
                    };
                },
                /**
                 * Pass data to the template
                 */
                serializeData: function () {
                    return this.config;
                },
                onRender: function () {
                    var self = this;

                    // init duration slider
                    this.ui.durationSlider.slider({
                        range: "min",
                        min: this.config.duration.min * 100,
                        max: this.config.duration.max * 100,
                        value: this.config.duration.default * 100,
                        change: function (e, ui) {
                            var duration = ui.value / 100.0;

                            // update ui label
                            self.ui.durationValue.html(duration);

                            // update config
                            self.config.duration.current = duration;
                        }
                    });

                    // init magnitude slider
                    this.ui.magnitudeSlider.slider({
                        range: "min",
                        min: this.config.magnitude.min * 100,
                        max: this.config.magnitude.max * 100,
                        value: this.config.magnitude.default * 100,
                        change: function (e, ui) {
                            // update ui label
                            self.ui.magnitudeValue.html(ui.value);

                            // update config
                            self.config.magnitude.current = ui.value / 100.0;
                        }
                    });
                }
            });
        });

        return App.module('Gestures.Views').Emotions;
    });

define(["application", "tpl!./templates/message.tpl"], function (App, template) {
    App.module("Interaction.Views", function (Views, App, Backbone, Marionette, $, _) {
        Views.Message = Marionette.ItemView.extend({
            tagName: 'li',
            template: template,
            ui: {
            },
            onRender: function () {
                this.$el.addClass(this.model.get('author') == 'Robot' ? 'right' : 'left');
            },
            serializeData: function () {
                return _.extend(this.model.toJSON(), {
                    time: this.currentTime()
                });
            },
            currentTime: function () {
                var date = new Date();
                var hour = date.getHours();
                var min = date.getMinutes();

                if (min < 10)
                    min = "0" + min;

                var amPm = hour < 12 ? "am" : "pm";

                if (hour > 12)
                    hour = hour - 12;

                return hour + ":" + min + " " + amPm;
            }
        });
    });

    return App.module('Interaction.Views').Message;
});

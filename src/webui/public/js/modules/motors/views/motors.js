define(['application', "marionette", "./motor", 'jquery-ui'],
    function (App, Marionette, motorView) {
        return Marionette.CollectionView.extend({
            childView: motorView,
            initialize: function () {
                var self = this;
                App.vent.on('motors:selection:set', function (status) {
                    self.showSelectButtons(status);
                })
            },
            /**
             * Pass label of the motor group to motor views when a new group appears
             *
             * @param model
             * @returns {{motorGroupLabel: *}}
             */
            childViewOptions: function (model) {
                var motorGroup = model.get('group');
                if (motorGroup && (typeof this.lastMotorGroup == 'undefined'
                    || this.lastMotorGroup != motorGroup)
                ) {
                    this.lastMotorGroup = motorGroup;
                } else {
                    motorGroup = null;
                }

                return {
                    monitoring: this.options['monitoring'],
                    motorGroupLabel: motorGroup
                }
            },
            onRender: function () {
                var self = this;

                clearInterval(this.monitoringInterval);
                if (this.options['monitoring']) {
                    this.monitoringInterval = setInterval(function () {
                        self.collection.updateStatus();
                    }, 1000)
                }
            },
            onDestroy: function () {
                clearInterval(this.monitoringInterval);
            },
            showSelectButtons: function (status) {
                this.children.each(function (motorView) {
                    motorView.showSelectButton(status);
                });
            }
        });
    });

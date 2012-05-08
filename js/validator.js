/*global reboot, FormData */

"use strict";

$(document).ready(function() {
	var nuURL = 'http://validator.nu/',
		$nu = $('#validator-nu'),
		$welcome = $('#welcome'),
		$welcomeMore = $('#welcome-more'),
		$readMore = $('#read-more'),
		$numErrors = $('#num-errors'),
		$allMessages,
		supportsLocalStorage,
		init,
		setupForm,
		setupResults,
		updateNumErrors;

	supportsLocalStorage = function() {
		try {
			return window.hasOwnProperty('localStorage') && window.localStorage !== null;
		} catch (e) {
			return false;
		}
	};

	init = function() {

		// Load validator.nu index
		$.ajax({
			type: 'GET',
			url: nuURL,
			success: function(data, textStatus, jqXHR) {
				var $index = $(data.substring(data.indexOf('<body>') + 6, data.indexOf('</body>')));

				// Insert index page HTML
				$nu.empty().html($index.not('script'));
				$('h1').after($welcome);

				// Load script
				$index.filter('script').each(function() {
					var src = nuURL + $(this).attr('src');
					$.getScript(src, function() {
						// Initialise validator.nu script
						if (typeof reboot === 'function') {
							reboot();
						}
					});
				});

				setupForm();
			},
			error: function() {
				alert('Error contacting ' + nuURL + '. Your browser may not support Cross-Origin Resource Sharing.');
			}
		});

		// Show "Read more" section on click
		$readMore.click(function(e) {
			e.preventDefault();
			$welcomeMore.toggle();
			if ($welcomeMore.is(':visible')) {
				$readMore.text('Read less');
			} else {
				$readMore.text('Read more');
			}
		});
	};

	setupForm = function() {
		// Attach event listener to form
		var $form = $('form:eq(0)').submit(function(e) {
			e.preventDefault();
			var docselect = $('#docselect').val(),
				options = {};

			if (docselect === 'textarea' || docselect === 'file') {
				// Direct input and file upload need to be posted as multipart/form data

				// Feature detect
				if (!window.hasOwnProperty('FormData')) {
					alert('Oops! Your web browser does not support the FormData object, which means that the File Upload and Text Field options will not work. You can still use the Address (URL) option or upgrade to a modern browser such as Chrome or Firefox.');
					return;
				}

				options.type = 'POST';
				options.contentType = false;
				options.processData = false;
				options.data = new FormData();

				// Append the inputs to the data parameter
				$form.find('input[name]:not([type=file]), select[name]').each(function() {
					var $input = $(this),
						val = $input.val();
					if (val && (!$input.is('[type=checkbox]') || $input.is(':checked'))) {
						options.data.append($input.attr('name'), val);
					}
				});
				if (docselect === 'textarea') {
					options.data.append('content', $('#doc').val());
				} else {
					options.data.append('file', $('#doc').get(0).files[0]);
				}
			} else {
				// URL input is sent as a GET request
				options.type = 'GET';
				options.data = $form.serialize();
			}

			// Load the validation results with Ajax
			options.url = nuURL;
			options.success = function(data, textStatus, jqXHR) {
				var $results = $(data.substring(data.indexOf('<body>') + 6, data.indexOf('</body>')));

				// Insert results page HTML
				$nu.empty().html($results.not('script'));
				$('h1').after($welcome);

				// Initialise validator.nu script
				if (typeof reboot === 'function') {
					reboot();
				}

				setupForm();
				setupResults();
			};
			options.error = function() {
				alert('Error contacting ' + nuURL);
			};
			$.ajax(options);
		});
	};

	setupResults = function() {

		$allMessages = $('li.error, li.warning');

		var $errors = $allMessages.filter('.error'),
			$warnings = $allMessages.filter('.warning'),
			$summary = $('<div id="summary"></div>'),
			makeFieldset;

		$summary.append('<p><strong>The validator gave ' + $errors.length.toString() + ($errors.length === 1 ? ' error' : ' errors') + ' and ' + $warnings.length.toString() + ($warnings.length === 1 ? ' warning' : ' warnings') + '.</strong></p>');

		// Show/hide the messages when the checkboxes are toggled
		$summary.on('change', 'input[type=checkbox]', function(e, data) {
			var $checkbox = $(this);
			$.each($checkbox.data('messageCollection'), function(index, $message) {
				if ($checkbox.is(':checked')) {
					$message.removeClass('hidden');
				} else {
					$message.addClass('hidden');
				}
			});
			if (supportsLocalStorage()) {
				localStorage[$checkbox.data('type') + ':' + $checkbox.data('messageName')] = $checkbox.is(':checked').toString();
			}
			if (!data) {
				updateNumErrors();
			}
		});

		$summary.on('click', 'a.hide', function(e) {
			e.preventDefault();
			$(this).closest('fieldset, li').find('input[type=checkbox]').removeAttr('checked').trigger('change', ['triggered']);
			updateNumErrors();
		});

		$summary.on('click', 'a.show', function(e) {
			e.preventDefault();
			$(this).closest('fieldset, li').find('input[type=checkbox]').attr('checked', 'checked').trigger('change', ['triggered']);
			updateNumErrors();
		});

		// Generate errors fieldset and warnings fieldset
		makeFieldset = function($messages, displayType) {
			var $fieldset,
				$messageList,
				$messageGroupList,
				$checkbox,
				messages = {},
				messagesSorted = [],
				type = displayType.toLowerCase(),
				messageGroup,
				uniqueMessage,
				makeCheckbox;

			makeCheckbox = function(messageName, messageCollection) {
				var $checkbox,
					$label;

				$checkbox = $('<input type="checkbox" checked="checked" />')
					.data('messageName', messageName)
					.data('messageCollection', messageCollection)
					.data('type', type);

				$label = $('<label></label>')
					.text(messageName + ' (' + messageCollection.length.toString() + ')')
					.prepend($checkbox);

				// Restore saved checkbox value from local storage
				if (supportsLocalStorage()) {
					if (localStorage.hasOwnProperty(type + ':' + messageName) && localStorage[type + ':' + messageName] === 'false') {
						$checkbox.removeAttr('checked');
						$.each(messageCollection, function(index, $message) {
							$message.addClass('hidden');
						});
					}
				}

				return $('<li></li>').append($label);
			};

			if ($messages.length > 0) {

				// Find the unique messages
				$messages.each(function() {
					var $message = $(this),
						uniqueMessage = $message.find('p:eq(0) > span').text(),
						messageGroup = $message.find('p:eq(0) > span').clone().find('code').text('___').end().text();

					if (!messages.hasOwnProperty(messageGroup)) {
						messages[messageGroup] = {
							messageCollection: [],
							uniqueMessages: {},
							uniqueMessagesLength: 0
						};
					}
					messages[messageGroup].messageCollection.push($message);

					if (!messages[messageGroup].uniqueMessages.hasOwnProperty(uniqueMessage)) {
						messages[messageGroup].uniqueMessages[uniqueMessage] = [];
						messages[messageGroup].uniqueMessagesLength += 1;
					}
					messages[messageGroup].uniqueMessages[uniqueMessage].push($message);
				});

				// Generate Hide/Show All buttons
				$fieldset = $('<fieldset></fieldset>').append(
					$('<legend>' + displayType + ' · </legend>')
						.append($('<a href="#" class="hide">Hide all ' + type + '</a>'))
						.append(' · ')
						.append($('<a href="#" class="show">Show all ' + type + '</a>'))
				);
				$messageList = $('<ol></ol>');

				for (messageGroup in messages) {
					if (messages.hasOwnProperty(messageGroup)) {

						$messageGroupList = $('<ol></ol>');

						for (uniqueMessage in messages[messageGroup].uniqueMessages) {
							if (messages[messageGroup].uniqueMessages.hasOwnProperty(uniqueMessage)) {
								$checkbox = makeCheckbox(uniqueMessage, messages[messageGroup].uniqueMessages[uniqueMessage]);
								if (messages[messageGroup].uniqueMessagesLength === 1) {
									$messageList.append($checkbox);
								} else {
									$messageGroupList.append($checkbox);
								}
							}
						}

						if (messages[messageGroup].uniqueMessagesLength > 1) {
							$('<li></li>')
								.text(messageGroup + ' (' + messages[messageGroup].messageCollection.length.toString() + ') · ')
								.append('<a href="#" class="hide">Hide all</a>')
								.append(' · ')
								.append('<a href="#" class="show">Show all</a>')
								.append($messageGroupList)
								.appendTo($messageList);
						}
					}
				}

				$summary.append($fieldset.append($messageList));
			}
		};
		makeFieldset($errors, 'Errors');
		makeFieldset($warnings, 'Warnings');

		$('form:eq(0)').after($summary);
	};

	updateNumErrors = function() {
		var $hidden = $allMessages.filter('.hidden');

		$numErrors.text(($allMessages.length - $hidden.length).toString() + '/' + $allMessages.length.toString())
			.stop()
			.css({'opacity': '0.5', 'display': 'block'})
			.delay(600)
			.fadeOut();
	};

	init();
});


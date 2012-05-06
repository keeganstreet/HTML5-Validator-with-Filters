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
				alert('Error contacting ' + nuURL);
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
					//$('#docselect option').remove();
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
		var $errors = $('li.error'),
			$warnings = $('li.warning'),
			$summary = $('<div id="summary"></div>'),
			errors = {},
			numUniqueErrors = 0,
			warnings = {},
			numUniqueWarnings = 0,
			makeFieldset;

		$allMessages = $('li.error, li.warning');

		$summary.append('<p><strong>The validator gave ' + $errors.length.toString() + ($errors.length === 1 ? ' error' : ' errors') + ' and ' + $warnings.length.toString() + ($warnings.length === 1 ? ' warning' : ' warnings') + '.</strong></p>');

		// Show/hide the messages when the checkboxes are toggled
		$summary.on('change', 'input[type=checkbox]', function(e, data) {
			var $checkbox = $(this);
			$.each($checkbox.data('items'), function(index, $message) {
				if ($checkbox.is(':checked')) {
					$message.removeClass('hidden');
				} else {
					$message.addClass('hidden');
				}
			});
			if (supportsLocalStorage()) {
				localStorage[$checkbox.data('type') + ':' + $checkbox.data('key')] = $checkbox.is(':checked').toString();
			}
			if (!data) {
				updateNumErrors();
			}
		});

		// Generate errors fieldset and warnings fieldset
		makeFieldset = function($messages, messages, numUnique, name) {
			var $fieldset,
				$hideAll,
				$showAll,
				$checkbox,
				type = name.toLowerCase(),
				i;

			if ($messages.length > 0) {

				// Find the unique messages
				$messages.each(function() {
					var $message = $(this),
						text = $message.find('p:eq(0) > span').text();
					if (!messages.hasOwnProperty(text)) {
						messages[text] = [];
						numUnique += 1;
					}
					messages[text].push($message);
				});

				// Generate Hide/Show All buttons
				$fieldset = $('<fieldset></fieldset>');
				$hideAll = $('<a href="#">Hide all ' + type + '</a>').on('click', function(e) {
					e.preventDefault();
					$fieldset.find('input[type=checkbox]').removeAttr('checked').trigger('change', ['triggered']);
					updateNumErrors();
				});
				$showAll = $('<a href="#">Show all ' + type + '</a>').on('click', function(e) {
					e.preventDefault();
					$fieldset.find('input[type=checkbox]').attr('checked', 'checked').trigger('change', ['triggered']);
					updateNumErrors();
				});
				$fieldset.append($('<legend>' + name + ' (' + numUnique.toString() + ' unique, ' + $messages.length.toString() + ' total) · </legend>').append($hideAll).append(' · ').append($showAll));

				for (i in messages) {
					if (messages.hasOwnProperty(i)) {
						$checkbox = $('<input type="checkbox" checked="checked" />').data('items', messages[i]).data('type', type).data('key', i);

						// Restore saved checkbox value from local storage
						if (supportsLocalStorage()) {
							if (localStorage.hasOwnProperty(type + ':' + i) && localStorage[type + ':' + i] === 'false') {
								$checkbox.removeAttr('checked');
								$.each(messages[i], function(index, $message) {
									$message.addClass('hidden');
								});
							}
						}

						$fieldset.append($('<label></label>').text(i + ' (' + messages[i].length.toString() + ')').prepend($checkbox));
					}
				}
				$summary.append($fieldset);
			}
		};
		makeFieldset($errors, errors, numUniqueErrors, 'Errors');
		makeFieldset($warnings, warnings, numUniqueWarnings, 'Warnings');

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


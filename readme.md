> **Update: The Message Filtering feature has been [upstreamed](https://github.com/keeganstreet/HTML5-Validator-with-Filters/issues/1) to the W3C's [Nu Html Checker](https://validator.w3.org/nu/).** This prototype is no longer necessary.

Some HTML errors are outside of the control of web developers. For example some frameworks and content management systems generate invalid HTML by adding obsolete elements or attributes. This validator lets you filter out these errors so that you can focus on the errors that you do have control over. Using filters effectively will ensure that the errors you need to know about don't get lost in the noise of framework/CMS errors.

The validation for this service is completely handled by Validator.nu. The validator is loaded with AJAX and filtering is added in as a layer on top with JavaScript. HTML5 local storage is used to remember your filtering preferences so you don't need to re-apply the same filters on every page.

To learn more, read the blog post [Filtering HTML5 Validator Errors](http://keegan.st/2012/05/28/filtering-html5-validator-errors/).

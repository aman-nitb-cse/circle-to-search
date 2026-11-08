# Privacy Policy — Circle to Search

**Developer:** Aman Kumar Patel  
**Contact:** [aman.nitb.cse@gmail.com](mailto:aman.nitb.cse@gmail.com)

Circle to Search is a Chrome extension that lets you select content visible in the active browser tab and submit it to Google Lens for a visual search. You can use Draw, Rectangle, or Full Screen mode.

This policy explains what the extension accesses, how it processes that information, and when information is sent to another service.

## 1. Information the extension accesses

When you activate Circle to Search and use its features, the extension may access or process the following information:

- **Visible tab content:** The extension captures an image of the currently visible area of the active tab when you initiate a search. Draw and Rectangle modes use the area you select. Full Screen mode uses the entire visible tab viewport.
- **Selection input:** In Draw and Rectangle modes, pointer coordinates are processed locally to display your selection and calculate the image crop. These coordinates are not separately transmitted or stored as activity records.
- **Keyboard shortcut activation:** Chrome's Commands API handles the shortcut configured for the extension. The extension receives the activation command; it does not record general keystrokes or monitor what you type into webpages.
- **Extension preferences:** The selected default search mode and appearance preference (Auto, Light, or Dark) are stored locally using Chrome Storage.
- **Temporary selected image:** The cropped image is temporarily placed in Chrome's local extension storage so the extension's search page can read it and submit it to Google Lens.

The extension does not ask you to create an account or provide your name, email address, password, payment details, or physical location.

Please avoid selecting content that you do not want to send to Google, including confidential, personal, or sensitive information.

## 2. How information is used

The extension uses the information described above only to provide its visual-search features:

- to display the selection interface in the active tab;
- to let you choose Draw, Rectangle, or Full Screen mode;
- to capture and crop the visible tab content you chose to search;
- to submit the resulting image to Google Lens when you initiate a search; and
- to remember your default search mode and appearance preference.

Selection coordinates are used locally to perform the selection and crop. Shortcut activation is handled by Chrome's extension-command mechanism. The extension does not use this information for advertising, behavioral profiling, or unrelated purposes.

## 3. Google Lens and other third-party services

A visual search requires sending the image to Google Lens. After you initiate a search, Circle to Search opens an extension page that submits the selected image to **Google Lens** at `lens.google.com`.

- In **Draw** and **Rectangle** modes, the image sent is the crop corresponding to the area you selected.
- In **Full Screen** mode, the image sent is the entire visible viewport of the active tab.

Google receives and processes the image to provide its visual-search service. Google's handling, use, and retention of submitted content are governed by Google's own terms and privacy practices, which Circle to Search does not control. Review [Google's Privacy Policy](https://policies.google.com/privacy) for more information.

The extension also provides a **Report a Bug** link that opens the project's GitHub Issues page. Opening that link is optional. Any information you choose to submit there is handled by GitHub under [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement). The extension does not automatically attach browsing data or diagnostic reports to an issue.

## 4. Storage and retention

- Your default search mode and appearance preference are stored locally in Chrome using `chrome.storage.local`.
- The selected image is temporarily stored in `chrome.storage.local` so the extension's search page can retrieve it. The search page removes that temporary image entry when it reads it, before submitting the image to Google Lens.
- If the search page does not load or read the temporary image, that entry may remain in local extension storage until it is overwritten, removed, or the extension's stored data is cleared.
- Circle to Search does not operate a developer-controlled server or database for storing users' images, preferences, browsing history, or search activity.

Once an image has been submitted, Google may retain or otherwise process it according to Google's own policies. Circle to Search cannot delete information held by Google.

You can clear the extension's locally stored data by removing the extension or clearing its site/extension data through Chrome.

## 5. Data sharing and sale

The developer does not sell, rent, or trade users' information.

The extension sends the image you choose to search to Google Lens because that transfer is necessary to provide the visual-search feature you requested. The extension does not send selected images, browsing history, preferences, or shortcut activity to the developer. It does not share information with third parties for advertising or unrelated purposes.

## 6. Permissions

Circle to Search requests the following Chrome permissions:

- **`activeTab`:** Provides temporary access to the active tab after you invoke the extension's keyboard command. This access is used to capture the visible tab for the search you initiate.
- **`scripting`:** Allows the extension to inject its selection interface and supporting styles into the active tab after activation.
- **`storage`:** Stores your default mode and appearance preference, and temporarily holds the selected image while it is passed to the extension's search page.

The extension uses Chrome's **Commands API** to receive its configured keyboard shortcut. It does not request broad host permissions or permanent access to all websites. Chrome may restrict extension injection and screen capture on certain browser pages, including Chrome-internal pages and other restricted pages.

## 7. Security

Circle to Search is designed to process selection coordinates in the active tab, keep preferences in local extension storage, and send selected image content only when you initiate a visual search. The extension does not operate its own server for collecting or storing this information.

No method of electronic storage or transmission is completely secure. Once you submit an image to Google Lens or information to GitHub, the relevant provider's security and privacy practices apply.

## 8. Children's privacy

Circle to Search is not designed to collect personal information from children. The extension does not require account registration and the developer does not knowingly collect children's personal information.

## 9. Changes to this policy

This Privacy Policy may be updated if the extension's functionality or privacy practices change. The revised policy will be published at this location with an updated effective or revision date. Please review it periodically.

## 10. Contact

For questions or concerns about this Privacy Policy or Circle to Search, contact:

**Aman Kumar Patel**  
**Email:** [aman.nitb.cse@gmail.com](mailto:aman.nitb.cse@gmail.com)

---

© 2026 Aman Kumar Patel. All rights reserved.

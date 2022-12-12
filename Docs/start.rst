**Opening a sample dataset**
-------------------------------
A Demo dataset is present in the QUINT-Demo collab: https://wiki.ebrains.eu/bin/view/Collabs/quint-demo/

Load the file by clicking on the file: "demo_mouse_data.waln"

Instructions about the operations are found both under "Documentation" on the upper right and inside the application by pressing the question mark.
In this ReadtheDocs, go to the next page for illustrated alignment instructions.

**Work with your own images**
----------------------------------------------------
1. Navigate to the WebWarp app in the left-hand panel: all the .waln files located in the Bucket are displayed on the WebWarp main page.

2. Select the waln file corresponding to your result from the WebAlign image registration.

3. Wait for the images to load: this may take some time.

4. Your registered images are visible in the main window.  The atlas regions with transparency sliders can be toggled using the "Atlas opacity" button.
   The color of the atlas outline can be modified by clicking on the colored rectangle.

5. When going to "Settings", the button for selecting the marker color will appear as well as "show triangles" which correspond to areas affected by the sane transformation.

5. Place a marker on an area you want to stretch using the space bar. Nonlinear distortions are applied by dragging a marker using the mouse.

6. Press Delete or Backspace to remove a marker under the mouse cursor.

:note::
 A good strategy is to place markers around the contour of the section first, and then proceed with refining the inner parts.
 
:note::
 Try to keep the number of markers to a minimum. Save your markers is allowing you to go back to previous section images.
 
7. Save your results pression the "save" button. "Save as" will allow you to save the adjustments as a new file with a different name.
 
8. When the registration is finished, you can export your descriptor files ( .seg files used for analysis in the QUINT workflow) by pressing "export       overlays". All results are zipped and stored in the bucket. The result file name will be the same as the one chosen to create the registration, e.g. "my-registration.zip".
 
 
 
 

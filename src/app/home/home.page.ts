import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { IonicSafeString, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(<any>pdfMake).vfs = pdfFonts.pdfMake.vfs;

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FileOpener } from '@awesome-cordova-plugins/file-opener/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  myForm!: FormGroup;
  pdfObj!: pdfMake.TCreatedPdf;
  photoPreview!: string;
  logoData!: string | ArrayBuffer | null;

  constructor(private fb: FormBuilder, private plt: Platform, private http: HttpClient, private fileOpener: FileOpener) { }

  ngOnInit() {
    this.myForm = this.fb.group({
      showLogo: true,
      from: 'Carl',
      to: 'Henning',
      text: 'This is sample text.'
    });

    this.loadLocalAssetToBase64();
  }

  loadLocalAssetToBase64() {
    this.http.get('./assets/images/vodafone-logo-2023.png', { responseType: 'blob' })
      .subscribe(res => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.logoData = reader.result;
        }
        reader.readAsDataURL(res);
      });
  }

  async takePicture() {
    const image = await Camera.getPhoto({
      quality: 100,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera
    });
    this.photoPreview = `data:image/jpeg;base64,${image.base64String}`;
  }

  createPdf() {
    const formvalue = this.myForm.value;
    const image = this.photoPreview ? { image: this.photoPreview, width: 300, alignment: 'center' } : {};

    let logo = {};
    if (formvalue.showLogo) {
      logo = { image: this.logoData, width: 150 }
    }

    const docDefinition: any = {
      watermark: { text: 'Development Bootcamp', color: 'red', opacity: 0.05, bold: true },
      content: [
        {
          columns: [
            logo,
            {
              text: new Date().toTimeString(),
              alignment: 'right'
            }
          ]
        },
        { text: 'REMINDER', style: 'header' },
        {
          columns: [
            {
              width: '50%',
              text: 'From',
              style: 'subheader'
            },
            {
              width: '50%',
              text: 'To',
              style: 'subheader'
            }
          ]
        },
        {
          columns: [
            {
              width: '50%',
              text: formvalue.from
            },
            {
              width: '50%',
              text: formvalue.to
            }
          ]
        },
        image, // The potentially captured image!
        { text: formvalue.text, margin: [0, 20, 0, 20] },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 15, 0, 0]
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 15, 0, 0]
        }
      }
    }
    this.pdfObj = pdfMake.createPdf(docDefinition);
  }

  downloadPdf() {
    if (this.plt.is('cordova')) {
      this.pdfObj.getBase64(async (data) => {
        try {
          let path = `pdf/myletter_${Date.now()}.pdf`;

          const result = await Filesystem.writeFile({
            path,
            data: data,
            directory: Directory.Documents,
            recursive: true
            // encoding: Encoding.UTF8
          });
          this.fileOpener.open(`${result.uri}`, 'application/pdf');

        } catch (e) {
          console.error('Unable to write file', e);
        }
      });
    } else {
      // On a browser simply use download!
      this.pdfObj.download();
    }
  }

}

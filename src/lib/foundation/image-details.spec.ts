import { TestBed } from '@angular/core/testing';
import { ImageGalleryStore, UI_IMAGE_DETAILS, normalizeImageDetails } from '../../public-api';

describe('Generic image details', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('retains consumer metadata through normalization and removes deleted image entries', () => {
    const association = {id: 'custom-resource'};
    expect(normalizeImageDetails({a: {location: ' Here ', caption: 'Two   words', association},
      b: {location: '', caption: ''}}, ['a'])).toEqual({a: {location: 'Here', caption: 'Two words', association}});
  });
  it('applies consumer validation and preserves metadata when the gallery saves', async () => {
    TestBed.configureTestingModule({providers: [{provide: UI_IMAGE_DETAILS, useValue: {
      normalize: normalizeImageDetails, valid: (details: {association?: unknown} | undefined) => !!details?.association,
      field: () => null, showLocation: () => true
    }}]});
    const store = TestBed.inject(ImageGalleryStore), onSave = vi.fn();
    const token = store.open({images: ['a'], slotCount: 1, readOnly: false, title: 'Gallery',
      uploadOwnerId: '', uploadEntityId: '', onSave});
    await store.save(token); expect(onSave).not.toHaveBeenCalled();
    store.updateDetails(token, {a: {location: ' Here ', caption: ' caption ', association: {id: 'x'}}});
    await store.save(token);
    expect(onSave).toHaveBeenCalledWith(['a'], {a: {location: 'Here', caption: 'caption', association: {id: 'x'}}});
  });
});

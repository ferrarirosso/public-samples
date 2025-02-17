import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import Caching from './components/Caching';

export default class CachingWebPart extends BaseClientSideWebPart<never> {

  public render(): void {
    const element: React.ReactElement<{}> = React.createElement(
      Caching, { }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

}
